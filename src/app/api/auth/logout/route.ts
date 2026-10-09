import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";

export async function POST() {
  try {
    const session = await getServerSession();
    session.destroy();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Logout error:", err);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
