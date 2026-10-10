import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { requireAuthenticatedMerchant, assertInvoiceOwnership } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db";
import { generateReceiptPdfBuffer } from "@/lib/pdf/generate-invoice-pdf";
import { evaluateInvoiceStatus } from "@/lib/invoice-utils";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    const { merchantId } = requireAuthenticatedMerchant(session);
    const { id } = await context.params;

    // Rate limit: 20 receipt generations per minute per merchant
    const rateLimit = await checkRateLimit(`receipt_download_${merchantId}`, 20, 60);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many receipt generation requests. Please wait a minute." },
        { status: 429 }
      );
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        merchant: true,
        paymentEvents: {
          orderBy: { confirmedAt: "asc" },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // IDOR Protection: Strictly enforce merchant ownership
    assertInvoiceOwnership(invoice, merchantId);

    if (invoice.paymentEvents.length === 0) {
      return NextResponse.json(
        { error: "No confirmed payments recorded for this invoice yet." },
        { status: 400 }
      );
    }

    const status = evaluateInvoiceStatus(invoice.status, invoice.dueDate);
    const receiptNumber = `REC-${invoice.invoiceNumber.replace(/^INV-/, "")}`;

    const pdfBuffer = await generateReceiptPdfBuffer({
      invoiceNumber: invoice.invoiceNumber,
      receiptNumber,
      publicId: invoice.publicId,
      title: invoice.title,
      merchantDisplayName: invoice.merchant.businessName || invoice.merchant.displayName,
      merchantWallet: invoice.merchant.walletAddress,
      totalInvoiceAmountUsdc: invoice.amountUsdc,
      totalPaidAmountUsdc: invoice.paidAmountUsdc,
      status,
      createdAt: invoice.createdAt,
      paymentEvents: invoice.paymentEvents.map((pe) => ({
        txHash: pe.txHash,
        payerAddress: pe.payerAddress,
        amountUsdc: pe.amountUsdc,
        blockNumber: pe.blockNumber,
        confirmedAt: pe.confirmedAt,
      })),
    });

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${receiptNumber}.pdf"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "statusCode" in err) {
      const status = (err as { statusCode: number }).statusCode;
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status });
    }
    console.error("GET /api/invoices/[id]/receipt error:", err);
    return NextResponse.json({ error: "Failed to generate receipt PDF" }, { status: 500 });
  }
}
