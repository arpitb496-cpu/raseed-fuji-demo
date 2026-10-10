import { type NextRequest, NextResponse } from "next/server";
import { PaymentReportSchema } from "@/lib/validation/payment-report";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyAndRecordPayment } from "@/lib/settlement/verification";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId } = await context.params;

    // Rate Limiting: 20 reports per minute per IP/publicId
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
    const rl = await checkRateLimit(`pay_report_${ip}_${publicId}`, 20, 60);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many payment report requests. Please slow down." },
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
