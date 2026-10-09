import { NextResponse } from "next/server";
import { CURRENT_NETWORK } from "@/config/network";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "disconnected";

  try {
    // Attempt basic DB query
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch {
    dbStatus = "error";
  }

  const latencyMs = Date.now() - startTime;

  return NextResponse.json({
    status: dbStatus === "connected" ? "healthy" : "degraded",
    network: CURRENT_NETWORK.name,
    chainId: CURRENT_NETWORK.chain.id,
    isTestnet: CURRENT_NETWORK.isTestnet,
    isRouterConfigured: CURRENT_NETWORK.isRouterConfigured,
    routerAddress: CURRENT_NETWORK.routerAddress,
    usdcAddress: CURRENT_NETWORK.usdcAddress,
    database: dbStatus,
    latencyMs,
    timestamp: new Date().toISOString(),
  });
}
