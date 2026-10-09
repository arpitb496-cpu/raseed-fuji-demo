import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Test-only endpoint for Playwright E2E automation.
 * Strictly disabled in production.
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Forbidden in production" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const testAddress = (body.address || "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC").toLowerCase();

    const merchant = await prisma.merchant.upsert({
      where: { walletAddress: testAddress },
      update: {},
      create: {
        walletAddress: testAddress,
        displayName: "E2E Test Merchant",
        businessName: "Acme Web3 Consulting",
      },
    });

    const session = await getServerSession();
    session.address = testAddress as `0x${string}`;
    session.merchantId = merchant.id;
    await session.save();

    return NextResponse.json({
      success: true,
      merchant,
    });
  } catch (err) {
    console.error("Mock login error:", err);
    return NextResponse.json({ error: "Mock login failed" }, { status: 500 });
  }
}
