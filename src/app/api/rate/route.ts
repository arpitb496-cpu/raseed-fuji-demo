import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  InrRateResponse,
  RATE_CACHE_TTL_MS,
  parseFrankfurterRate,
} from "@/lib/rate";

const FRANKFURTER_USD_INR_URL = "https://api.frankfurter.dev/v2/rate/usd/inr";
const FETCH_TIMEOUT_MS = 3000;

interface CachedRateEntry {
  data: InrRateResponse;
  cachedAt: number;
}

let cachedRate: CachedRateEntry | null = null;

export function _resetRateCacheForTest(): void {
  cachedRate = null;
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return req.headers.get("x-real-ip") || "unknown";
}

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await checkRateLimit(`rate:${ip}`, 60, 60);
    if (!rl.success) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const now = Date.now();
    if (cachedRate && now - cachedRate.cachedAt < RATE_CACHE_TTL_MS) {
      return NextResponse.json(cachedRate.data, {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=600, s-maxage=600",
        },
      });
    }

    const upstreamRes = await fetch(FRANKFURTER_USD_INR_URL, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: 600 },
    });

    if (!upstreamRes.ok) {
      return NextResponse.json({ error: "rate_unavailable" }, { status: 503 });
    }

    const json: unknown = await upstreamRes.json();
    const rate = parseFrankfurterRate(json);
    if (rate === null) {
      return NextResponse.json({ error: "rate_unavailable" }, { status: 503 });
    }

    const payload: InrRateResponse = {
      base: "USD",
      quote: "INR",
      rate,
      asOf: new Date().toISOString(),
      source: "Frankfurter",
    };

    cachedRate = { data: payload, cachedAt: now };

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=600, s-maxage=600",
      },
    });
  } catch {
    return NextResponse.json({ error: "rate_unavailable" }, { status: 503 });
  }
}
