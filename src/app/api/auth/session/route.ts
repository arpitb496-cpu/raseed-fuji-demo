import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession();

    if (!session.merchantId || !session.address) {
      return NextResponse.json({ authenticated: false });
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: session.merchantId },
      select: {
        id: true,
        walletAddress: true,
        displayName: true,
        businessName: true,
        defaultCurrencyDisplay: true,
      },
    });

    if (!merchant) {
      session.destroy();
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({
      authenticated: true,
      merchant,
      address: session.address,
    });
  } catch (err) {
    console.error("Session lookup error:", err);
    return NextResponse.json({ authenticated: false });
  }
}
