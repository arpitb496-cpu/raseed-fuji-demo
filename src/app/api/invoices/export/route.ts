import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { requireAuthenticatedMerchant } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db";
import { escapeCsvCell, evaluateInvoiceStatus } from "@/lib/invoice-utils";
import { formatUsdc } from "@/lib/currency";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession();
    const { merchantId } = requireAuthenticatedMerchant(session);

    const invoices = await prisma.invoice.findMany({
      where: { merchantId },
      orderBy: { createdAt: "desc" },
    });

    const headers = [
      "Invoice Number",
      "Public ID",
      "Title",
      "Client Name",
      "Client Email",
      "Due Date",
      "Status",
      "Total USDC",
      "Paid USDC",
      "Created At",
    ];

    const rows = invoices.map((inv) => {
      const status = evaluateInvoiceStatus(inv.status, inv.dueDate);
      return [
        escapeCsvCell(inv.invoiceNumber),
        escapeCsvCell(inv.publicId),
        escapeCsvCell(inv.title),
        escapeCsvCell(inv.clientName || ""),
        escapeCsvCell(inv.clientEmail || ""),
        escapeCsvCell(inv.dueDate.toISOString().split("T")[0]),
        escapeCsvCell(status),
        escapeCsvCell(formatUsdc(inv.amountUsdc)),
        escapeCsvCell(formatUsdc(inv.paidAmountUsdc)),
        escapeCsvCell(inv.createdAt.toISOString()),
      ].join(",");
    });

    const csvContent = [headers.map(escapeCsvCell).join(","), ...rows].join("\n");

    // Audit log entry
    await prisma.auditLog.create({
      data: {
        merchantId,
        action: "INVOICES_EXPORTED_CSV",
        details: JSON.stringify({ count: invoices.length }),
      },
    });

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="raseed_invoices.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "statusCode" in err) {
      const status = (err as { statusCode: number }).statusCode;
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status });
    }
    console.error("GET /api/invoices/export error:", err);
    return NextResponse.json({ error: "Failed to export CSV" }, { status: 500 });
  }
}
