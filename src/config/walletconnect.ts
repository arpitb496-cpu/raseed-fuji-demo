export const DEFAULT_WALLETCONNECT_PROJECT_ID = "3a8170812b534d0ff9d794f19a901d64";

/**
 * Validates WalletConnect configuration.
 * In production: fails fast if NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is missing or equals the hardcoded sample ID.
 * In development / test: falls back to sample ID and logs a clear warning.
 */
export function validateWalletConnectConfig(
  projectId: string | undefined = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  isProduction: boolean = process.env.NODE_ENV === "production"
): string {
  const trimmed = projectId?.trim();

  if (isProduction) {
    if (!trimmed || trimmed === DEFAULT_WALLETCONNECT_PROJECT_ID) {
      throw new Error(
        "CONFIGURATION ERROR: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is required in production and must not use the hardcoded sample ID. Please obtain a valid Project ID from https://cloud.walletconnect.com."
      );
    }
    return trimmed;
  }

  // Development / test fallback
  if (!trimmed || trimmed === DEFAULT_WALLETCONNECT_PROJECT_ID) {
    if (typeof console !== "undefined" && typeof console.warn === "function" && process.env.NODE_ENV === "development") {
      console.warn(
        "[DEV WARNING] Using hardcoded sample NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID. Configure your own project ID at https://cloud.walletconnect.com for production."
      );
    }
    return DEFAULT_WALLETCONNECT_PROJECT_ID;
  }

  return trimmed;
}
