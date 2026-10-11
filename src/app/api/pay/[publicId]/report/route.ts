import { type NextRequest, NextResponse } from "next/server";
import { PaymentReportSchema } from "@/lib/validation/payment-report";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyAndRecordPayment } from "@/lib/settlement/verification";
import { prisma } from "@/lib/db";

export function getClientIp(req: Request | NextRequest): string {
  // 1. Platform-asserted headers (cannot be forged by client on Vercel / Cloudflare)
  const xRealIp = req.headers.get("x-real-ip");
  if (xRealIp && xRealIp.trim()) {
    return xRealIp.trim();
  }

  const xVercelIp = req.headers.get("x-vercel-forwarded-for");
  if (xVercelIp && xVercelIp.trim()) {
    return xVercelIp.split(",")[0].trim();
  }

  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp && cfConnectingIp.trim()) {
    return cfConnectingIp.trim();
  }

  // 2. Fallback to x-forwarded-for with basic validation
  const xForwardedFor = req.headers.get("x-forwarded-for");
  if (xForwardedFor && xForwardedFor.trim()) {
    const candidate = xForwardedFor.split(",")[0].trim();
    if (/^[a-zA-Z0-9:.]+$/.test(candidate)) {
      return candidate;
    }
  }

  return "unknown_client";
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId } = await context.params;

    const ip = getClientIp(req);

    // Rate Limiting 1: 20 reports per minute per IP + publicId
    const ipRl = await checkRateLimit(`pay_report_ip_${ip}_${publicId}`, 20, 60);
    if (!ipRl.success) {
      return NextResponse.json(
        { error: "Too many payment report requests from this IP. Please slow down." },
        { status: 429 }
      );
    }

    // Rate Limiting 2: 60 reports per minute total per publicId (protects against rotating IPs)
    const invoiceRl = await checkRateLimit(`pay_report_invoice_${publicId}`, 60, 60);
    if (!invoiceRl.success) {
      return NextResponse.json(
        { error: "Too many payment report requests for this invoice. Please slow down." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = PaymentReportSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parseResult.error.issues },
        { status: 400 }
      );
    }

    // PublicId in route path must match body
    if (parseResult.data.publicId !== publicId) {
      return NextResponse.json(
        { error: "Public ID in path does not match request body" },
        { status: 400 }
      );
    }

    const normalizedTxHash = parseResult.data.txHash.toLowerCase();

    // Fast-path: If txHash is already stored as a PaymentEvent, return current state with no RPC call
    const existingEvent = await prisma.paymentEvent.findFirst({
      where: {
        txHash: normalizedTxHash,
      },
      include: {
        invoice: {
          select: {
            status: true,
            paidAmountUsdc: true,
          },
        },
      },
    });

    if (existingEvent) {
      return NextResponse.json({
        success: true,
        status: existingEvent.invoice.status,
        paidAmountUsdc: existingEvent.invoice.paidAmountUsdc.toString(),
        recordedEvents: 0,
        alreadyProcessed: true,
      });
    }

    const result = await verifyAndRecordPayment({
      publicId: parseResult.data.publicId,
      txHash: parseResult.data.txHash,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.statusCode || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      status: result.settlement?.newStatus,
      paidAmountUsdc: result.settlement?.paidAmountUsdc.toString(),
      recordedEvents: result.recordedEvents,
    });
  } catch (err) {
    console.error("Payment report endpoint error:", err);
    return NextResponse.json(
      { error: "Internal error processing payment report" },
      { status: 500 }
    );
  }
}
