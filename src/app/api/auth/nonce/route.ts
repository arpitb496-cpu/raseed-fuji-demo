import { type NextRequest, NextResponse } from "next/server";
import { generateNonce } from "siwe";
import { getServerSession } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
    const rl = await checkRateLimit(`auth_nonce_${ip}`, 30, 60);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many nonce requests. Please wait." },
        { status: 429 }
      );
    }

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
