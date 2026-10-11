import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { requireAuthenticatedMerchant, assertInvoiceOwnership } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db";
import { evaluateInvoiceStatus } from "@/lib/invoice-utils";
import { InvoiceStatus } from "@prisma/client";
import { verifyRequestOrigin } from "@/lib/auth/csrf";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    const { merchantId } = requireAuthenticatedMerchant(session);

    const rateLimit = await checkRateLimit(`get_invoice_${merchantId}`, 60, 60);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a minute." },
        { status: 429 }
      );
    }

    const { id } = await context.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        items: true,
        merchant: {
          select: {
            id: true,
            displayName: true,
            businessName: true,
            walletAddress: true,
          },
        },
        paymentEvents: {
          orderBy: { confirmedAt: "desc" },
        },
        auditLogs: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // IDOR Protection: Strictly enforce merchant ownership
    assertInvoiceOwnership(invoice, merchantId);

    const evaluatedStatus = evaluateInvoiceStatus(invoice.status, invoice.dueDate);

    return NextResponse.json({
      invoice: {
        ...invoice,
        status: evaluatedStatus,
        amountUsdc: invoice.amountUsdc.toString(),
        paidAmountUsdc: invoice.paidAmountUsdc.toString(),
        items: invoice.items.map((it) => ({
          ...it,
          unitAmountUsdc: it.unitAmountUsdc.toString(),
        })),
        paymentEvents: invoice.paymentEvents.map((pe) => ({
          ...pe,
          amountUsdc: pe.amountUsdc.toString(),
          feeUsdc: pe.feeUsdc.toString(),
          blockNumber: pe.blockNumber.toString(),
        })),
        auditLogs: invoice.auditLogs.map((log) => ({
          id: log.id,
          action: log.action,
          details: log.details,
          createdAt: log.createdAt.toISOString(),
        })),
      },
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "statusCode" in err) {
      const status = (err as { statusCode: number }).statusCode;
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status });
    }
    console.error("GET /api/invoices/[id] error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const originCheck = verifyRequestOrigin(req);
    if (!originCheck.valid) {
      return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    }

    const session = await getServerSession();
    const { merchantId } = requireAuthenticatedMerchant(session);
    const { id } = await context.params;

    const existing = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // IDOR Protection: Strictly enforce merchant ownership
    assertInvoiceOwnership(existing, merchantId);

    const body = await req.json();
    const { action } = body; // "SEND" | "CANCEL"

    if (action === "SEND") {
      if (existing.status !== InvoiceStatus.DRAFT) {
        return NextResponse.json({ error: "Only draft invoices can be marked as sent" }, { status: 400 });
      }

      const updated = await prisma.$transaction(async (tx) => {
        const inv = await tx.invoice.update({
          where: { id },
          data: { status: InvoiceStatus.SENT },
        });

        await tx.auditLog.create({
          data: {
            merchantId,
            invoiceId: id,
            action: "INVOICE_SENT",
          },
        });

        return inv;
      });

      return NextResponse.json({
        success: true,
        invoice: {
          ...updated,
          amountUsdc: updated.amountUsdc.toString(),
          paidAmountUsdc: updated.paidAmountUsdc.toString(),
        },
      });
    }

    if (action === "CANCEL") {
      if (existing.status === InvoiceStatus.PAID) {
        return NextResponse.json({ error: "Cannot cancel a paid invoice" }, { status: 400 });
      }

      const updated = await prisma.$transaction(async (tx) => {
        const inv = await tx.invoice.update({
          where: { id },
          data: { status: InvoiceStatus.CANCELLED },
        });

        await tx.auditLog.create({
          data: {
            merchantId,
            invoiceId: id,
            action: "INVOICE_CANCELLED",
          },
        });

        return inv;
      });

      return NextResponse.json({
        success: true,
        invoice: {
          ...updated,
          amountUsdc: updated.amountUsdc.toString(),
          paidAmountUsdc: updated.paidAmountUsdc.toString(),
        },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "statusCode" in err) {
      const status = (err as { statusCode: number }).statusCode;
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status });
    }
    console.error("PATCH /api/invoices/[id] error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const originCheck = verifyRequestOrigin(req);
    if (!originCheck.valid) {
      return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    }

    const session = await getServerSession();
    const { merchantId } = requireAuthenticatedMerchant(session);
    const { id } = await context.params;

    const existing = await prisma.invoice.findUnique({
      where: { id },
      include: {
        _count: { select: { paymentEvents: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // IDOR Protection: Strictly enforce merchant ownership
    assertInvoiceOwnership(existing, merchantId);

    if (existing.status === InvoiceStatus.PAID || existing._count.paymentEvents > 0) {
      return NextResponse.json(
        { error: "Cannot delete an invoice that has recorded on-chain payments" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          merchantId,
          action: "INVOICE_DELETED",
          details: JSON.stringify({ id, invoiceNumber: existing.invoiceNumber }),
        },
      });

      await tx.invoice.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "statusCode" in err) {
      const status = (err as { statusCode: number }).statusCode;
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status });
    }
    console.error("DELETE /api/invoices/[id] error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
