import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { requireAuthenticatedMerchant } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession();
    const { merchantId } = requireAuthenticatedMerchant(session);

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      include: {
        invoices: {
          include: {
            items: true,
            paymentEvents: true,
          },
        },
        auditLogs: true,
      },
    });

    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const payload = JSON.stringify(
      merchant,
      (_key, value) => (typeof value === "bigint" ? value.toString() : value),
      2
    );
    const filename = `raseed-merchant-export-${merchant.walletAddress.slice(0, 8)}-${Date.now()}.json`;

    return new NextResponse(payload, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "statusCode" in err) {
      const status = (err as { statusCode: number }).statusCode;
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status });
    }
    console.error("GET /api/merchant/export error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
