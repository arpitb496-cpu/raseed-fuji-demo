export interface InrRateResponse {
  base: "USD";
  quote: "INR";
  rate: number;
  asOf: string;
  source: "Frankfurter";
}

export const RATE_MIN_INR = 20;
export const RATE_MAX_INR = 500;
export const RATE_CACHE_TTL_MS = 600_000; // 10 minutes (600 seconds)

/**
 * Defensively parses and validates the USD/INR rate from Frankfurter v2 response.
 * Rejects non-numbers, NaN/Infinity, <= 0, and values outside [20, 500].
 */
export function parseFrankfurterRate(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const rate = (payload as Record<string, unknown>).rate;
  if (typeof rate !== "number" || !Number.isFinite(rate)) {
    return null;
  }

  if (rate <= 0 || rate < RATE_MIN_INR || rate > RATE_MAX_INR) {
    return null;
  }

  return rate;
}

/**
 * Formats an ISO timestamp into a concise, deterministic UTC display string.
 */
export function formatRateTimestamp(asOfIso: string): string {
  const parsed = new Date(asOfIso);
  if (Number.isNaN(parsed.getTime())) {
    return asOfIso;
  }
  return `${parsed.toISOString().replace("T", " ").slice(0, 16)} UTC`;
}

/**
 * Formats the bilingual indicative USD/INR reference label.
 */
export function formatInrReferenceLabel(
  rate: number,
  asOfIso: string,
  lang: "en" | "hi" = "en"
): string {
  const formattedRate = rate.toFixed(2);
  const formattedTime = formatRateTimestamp(asOfIso);

  if (lang === "hi") {
    return `सांकेतिक संदर्भ: 1 USDC ≈ ₹${formattedRate} INR। ${formattedTime} तक की संदर्भ दर। यह मानता है कि 1 USDC = 1 USD। भुगतान केवल USDC में किए जाते हैं।`;
  }

  return `Indicative reference: 1 USDC ≈ ₹${formattedRate} INR. Reference rate as of ${formattedTime}. Assumes 1 USDC = 1 USD. Payments are made in USDC only.`;
}
