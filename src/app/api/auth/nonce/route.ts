import { NextResponse } from "next/server";
import { generateNonce } from "siwe";
import { getServerSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession();
    const nonce = generateNonce();
    session.nonce = nonce;
    session.issuedAt = Date.now();
    await session.save();

    return NextResponse.json({ nonce });
  } catch (err) {
    console.error("Failed to generate SIWE nonce:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
