// Financial & Protocol Constants

/** Micro-units per 1 whole USDC (6 decimals) */
export const USDC_UNIT = 1_000_000n;

/** Minimum invoice amount: 1.00 USDC (1,000,000 micro-units) */
export const MIN_INVOICE_AMOUNT_USDC = 1_000_000n;
export const MIN_INVOICE_AMOUNT_FLOAT = 1.0;

/** Dust threshold: 0.01 USDC (10,000 micro-units). Payments below this do not transition invoice status */
export const DUST_THRESHOLD_USDC = 10_000n;
export const DUST_THRESHOLD_FLOAT = 0.01;

/** Protocol fee cap: 100 basis points (1.00%) */
export const MAX_FEE_BPS = 100;

/** Default Currency */
export const DEFAULT_CURRENCY = "USD";
export const SUPPORTED_DISPLAY_CURRENCIES = ["USD", "INR"] as const;
export type DisplayCurrency = (typeof SUPPORTED_DISPLAY_CURRENCIES)[number];

/** Approximate reference exchange rate (USD to INR), clearly marked as indicative */
export const INDICATIVE_USD_TO_INR_RATE = 86.5;
