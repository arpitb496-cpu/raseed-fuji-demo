import { type NextRequest, NextResponse } from "next/server";
import { SiweMessage } from "siwe";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    const body = await req.json();
    const { message, signature } = body;

    if (!message || !signature) {
      return NextResponse.json({ error: "Missing message or signature" }, { status: 400 });
    }

    const siweMessage = new SiweMessage(message);

    // Validate one-time nonce
    if (siweMessage.nonce !== session.nonce) {
      return NextResponse.json({ error: "Invalid or expired nonce" }, { status: 422 });
    }

    // Verify cryptographic signature
    const verification = await siweMessage.verify({ signature });

    if (!verification.success) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const walletAddress = verification.data.address.toLowerCase();

    // Upsert merchant record in DB
    const merchant = await prisma.merchant.upsert({
      where: { walletAddress },
      update: {},
      create: {
        walletAddress,
        displayName: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
      },
    });

    // Rotate and persist session
    session.address = verification.data.address as `0x${string}`;
    session.merchantId = merchant.id;
    session.nonce = undefined; // Invalidate nonce immediately (one-time use)
    await session.save();

    return NextResponse.json({
      success: true,
      merchant: {
        id: merchant.id,
        walletAddress: merchant.walletAddress,
        displayName: merchant.displayName,
      },
    });
  } catch (err) {
    console.error("SIWE verification error:", err);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
