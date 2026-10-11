import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { verifyRequestOrigin } from "@/lib/auth/csrf";

export async function POST(req: NextRequest) {
  try {
    const originCheck = verifyRequestOrigin(req);
    if (!originCheck.valid) {
      return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    }

    const session = await getServerSession();
    session.destroy();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Logout error:", err);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
