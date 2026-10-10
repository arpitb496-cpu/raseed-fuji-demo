import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { requireAuthenticatedMerchant, assertInvoiceOwnership } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db";
import { generateInvoicePdfBuffer } from "@/lib/pdf/generate-invoice-pdf";
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

    // Rate limit: 20 PDF generations per minute per merchant
    const rateLimit = await checkRateLimit(`pdf_download_${merchantId}`, 20, 60);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many PDF generation requests. Please wait a minute." },
        { status: 429 }
      );
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        items: true,
        merchant: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // IDOR Protection: Strictly enforce merchant ownership
    assertInvoiceOwnership(invoice, merchantId);

    const status = evaluateInvoiceStatus(invoice.status, invoice.dueDate);

    const pdfBuffer = await generateInvoicePdfBuffer({
      invoiceNumber: invoice.invoiceNumber,
      publicId: invoice.publicId,
      title: invoice.title,
      notes: invoice.notes,
      clientName: invoice.clientName,
      clientEmail: invoice.clientEmail,
      merchantDisplayName: invoice.merchant.businessName || invoice.merchant.displayName,
      merchantWallet: invoice.merchant.walletAddress,
      amountUsdc: invoice.amountUsdc,
      status,
      dueDate: invoice.dueDate,
      createdAt: invoice.createdAt,
      items: invoice.items.map((it) => ({
        description: it.description,
        quantity: it.quantity,
        unitAmountUsdc: it.unitAmountUsdc,
      })),
    });

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "statusCode" in err) {
      const status = (err as { statusCode: number }).statusCode;
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status });
    }
    console.error("GET /api/invoices/[id]/pdf error:", err);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
