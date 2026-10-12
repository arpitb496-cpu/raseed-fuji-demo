export const DEFAULT_CONFIRMATIONS = 3;

/**
 * Single source of truth for the required blockchain confirmation count.
 * Reads process.env.CONFIRMATIONS on server / test, falling back to DEFAULT_CONFIRMATIONS (3).
 */
export function getRequiredConfirmations(): number {
  if (typeof process !== "undefined" && process.env?.CONFIRMATIONS) {
    const parsed = parseInt(process.env.CONFIRMATIONS, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_CONFIRMATIONS;
}
