import { z } from "zod";

/**
 * Standard Zod schema for EVM addresses.
 * Validates 0x-prefixed 40-hex-character string and normalizes to lowercase.
 */
export const EvmAddressSchema = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM address format")
  .transform((val) => val.toLowerCase() as `0x${string}`);

/**
 * Normalizes an EVM address to lowercase.
 * Throws ZodError if invalid format.
 */
export function normalizeAddress(address: string): `0x${string}` {
  return EvmAddressSchema.parse(address);
}

/**
 * Compares two EVM addresses case-insensitively.
 */
export function areAddressesEqual(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}
