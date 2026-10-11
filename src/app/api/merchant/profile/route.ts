import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { requireAuthenticatedMerchant } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { verifyRequestOrigin } from "@/lib/auth/csrf";

export const dynamic = "force-dynamic";

const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  businessName: z.string().max(100).optional().nullable(),
  country: z.string().max(50).optional().nullable(),
  defaultCurrencyDisplay: z.enum(["USD", "INR"]).optional(),
});

export async function GET() {
  try {
    const session = await getServerSession();
    const { merchantId } = requireAuthenticatedMerchant(session);

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    return NextResponse.json({ merchant });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "statusCode" in err) {
      const status = (err as { statusCode: number }).statusCode;
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status });
    }
    console.error("GET /api/merchant/profile error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const originCheck = verifyRequestOrigin(req);
    if (!originCheck.valid) {
      return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    }

    const session = await getServerSession();
    const { merchantId } = requireAuthenticatedMerchant(session);

    const body = await req.json();
    const parseResult = UpdateProfileSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parseResult.error.issues },
        { status: 400 }
      );
    }

    const updated = await prisma.merchant.update({
      where: { id: merchantId },
      data: parseResult.data,
    });

    return NextResponse.json({ success: true, merchant: updated });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "statusCode" in err) {
      const status = (err as { statusCode: number }).statusCode;
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status });
    }
    console.error("PATCH /api/merchant/profile error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession();
    const { merchantId } = requireAuthenticatedMerchant(session);

    // Check if merchant has any financial records (PAID / PARTIALLY_PAID invoices or confirmed PaymentEvents)
    const financialRecordsCount = await prisma.invoice.count({
      where: {
        merchantId,
        OR: [
          { status: "PAID" },
          { status: "PARTIALLY_PAID" },
          { paymentEvents: { some: {} } },
        ],
      },
    });

    if (financialRecordsCount > 0) {
      // Compliance & Audit rule: Anonymize personal data, keep immutable payment events and transaction records
      await prisma.$transaction(async (tx) => {
        // 1. Anonymize Merchant PII
        await tx.merchant.update({
          where: { id: merchantId },
          data: {
            displayName: "Anonymized Merchant",
            businessName: null,
            country: null,
          },
        });

        // 2. Anonymize Client PII on paid/partially paid invoices
        await tx.invoice.updateMany({
          where: { merchantId },
          data: {
            clientName: "Anonymized Client",
            clientEmail: null,
            notes: null,
          },
        });

        // 3. Delete non-financial draft/unpaid invoices without payment events
        await tx.invoice.deleteMany({
          where: {
            merchantId,
            status: { in: ["DRAFT", "CANCELLED"] },
            paymentEvents: { none: {} },
          },
        });

        // 4. Log audit event
        await tx.auditLog.create({
          data: {
            merchantId,
            action: "MERCHANT_DATA_ANONYMIZED",
            details: JSON.stringify({
              reason: "GDPR/Privacy right to be forgotten requested. Payment records retained for regulatory compliance.",
              financialRecordsCount,
            }),
          },
        });
      });

      session.destroy();
      return NextResponse.json({
        success: true,
        anonymized: true,
        message: "Personal data anonymized. Payment and transaction records preserved for accounting and tax compliance.",
      });
    }

    // If zero financial records exist, delete non-financial invoices first, then delete merchant (respecting ON DELETE RESTRICT)
    await prisma.$transaction(async (tx) => {
      await tx.invoice.deleteMany({
        where: { merchantId },
      });
      await tx.merchant.delete({
        where: { id: merchantId },
      });
    });

    session.destroy();

    return NextResponse.json({ success: true, deleted: true });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "statusCode" in err) {
      const status = (err as { statusCode: number }).statusCode;
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status });
    }
    console.error("DELETE /api/merchant/profile error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
