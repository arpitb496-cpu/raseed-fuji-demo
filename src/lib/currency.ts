import { INDICATIVE_USD_TO_INR_RATE, USDC_UNIT } from "@/config/constants";

/**
 * Converts micro-USDC integer (6 decimals) into a clean decimal string (e.g. 1000000n -> "1.00").
 */
export function formatMicroUsdc(microAmount: bigint | number | string): string {
  const bigVal = BigInt(microAmount);
  const isNegative = bigVal < 0n;
  const absVal = isNegative ? -bigVal : bigVal;

  const whole = absVal / USDC_UNIT;
  const fraction = absVal % USDC_UNIT;

  const fractionStr = fraction.toString().padStart(6, "0").slice(0, 2);
  const formattedWhole = Number(whole).toLocaleString("en-US");

  return `${isNegative ? "-" : ""}${formattedWhole}.${fractionStr}`;
}

/**
 * Direct alias for formatMicroUsdc for clean invocation
 */
export const formatUsdc = formatMicroUsdc;

/**
 * Parses user input float or integer string into micro-USDC bigint.
 */
export function parseUsdcToMicro(input: string | number): bigint {
  const numStr = typeof input === "number" ? input.toString() : input.trim();
  if (!numStr || isNaN(Number(numStr))) {
    return 0n;
  }

  const parts = numStr.split(".");
  const wholePart = BigInt(parts[0] || "0");
  const rawFrac = (parts[1] || "").slice(0, 6);
  const paddedFrac = rawFrac.padEnd(6, "0");
  const fracPart = BigInt(paddedFrac);

  return wholePart * USDC_UNIT + fracPart;
}

/**
 * Calculates indicative INR estimate based on indicative demo conversion rate constant.
 */
export function formatInrEstimate(microAmount: bigint | number | string): string {
  const bigVal = BigInt(microAmount);
  const usdcFloat = Number(bigVal) / Number(USDC_UNIT);
  const inrValue = usdcFloat * INDICATIVE_USD_TO_INR_RATE;

  return inrValue.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}
