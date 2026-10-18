import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { evaluateInvoiceStatus } from "@/lib/invoice-utils";
import { CURRENT_NETWORK, isConfiguredAddress } from "@/config/network";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId } = await context.params;

    // Rate Limiting: 60 queries per minute per IP to protect against enumeration scans
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
    const rl = await checkRateLimit(`pay_public_query_${ip}`, 60, 60);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429 }
      );
    }

    // Consistent timing/format check: publicId validation
    const isValidFormat = typeof publicId === "string" && publicId.startsWith("raseed_") && publicId.length >= 20 && publicId.length <= 100;

    if (!isValidFormat) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { publicId },
      include: {
        merchant: {
          select: {
            displayName: true,
            businessName: true,
            walletAddress: true,
          },
        },
        items: {
          select: {
            description: true,
            quantity: true,
            unitAmountUsdc: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const currentStatus = evaluateInvoiceStatus(invoice.status, invoice.dueDate);
    const amountUsdc = invoice.amountUsdc;
    const paidAmountUsdc = invoice.paidAmountUsdc;
    const remainingUsdc = amountUsdc > paidAmountUsdc ? amountUsdc - paidAmountUsdc : 0n;

    // Return strictly sanitized fields — NO internal database IDs, NO clientEmail, NO PII
    return NextResponse.json({
      publicId: invoice.publicId,
      onchainInvoiceId: invoice.onchainInvoiceId,
      title: invoice.title,
      notes: invoice.notes,
      currencyDisplay: invoice.currencyDisplay,
      amountUsdc: amountUsdc.toString(),
      paidAmountUsdc: paidAmountUsdc.toString(),
      remainingUsdc: remainingUsdc.toString(),
      dueDate: invoice.dueDate.toISOString(),
      status: currentStatus,
      merchant: {
        displayName: invoice.merchant.displayName,
        businessName: invoice.merchant.businessName,
        walletAddress: invoice.merchant.walletAddress,
      },
      items: invoice.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitAmountUsdc: item.unitAmountUsdc.toString(),
      })),
      network: {
        chainId: CURRENT_NETWORK.chain.id,
        networkName: CURRENT_NETWORK.name,
        routerAddress: isConfiguredAddress(CURRENT_NETWORK.routerAddress)
          ? CURRENT_NETWORK.routerAddress
          : null,
        routerConfigured: isConfiguredAddress(CURRENT_NETWORK.routerAddress),
        usdcAddress: CURRENT_NETWORK.usdcAddress,
        explorerUrl: CURRENT_NETWORK.explorerUrl,
      },
    });
  } catch (err) {
    console.error("GET /api/pay/[publicId] error:", err);
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
}
