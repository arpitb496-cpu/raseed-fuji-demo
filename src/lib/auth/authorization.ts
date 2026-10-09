// IDOR and Authorization Guards for Raseed Protocol

import { type SessionData } from "./session";

export class UnauthorizedError extends Error {
  readonly statusCode = 401;
  constructor(message = "Authentication required. Please connect wallet.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenInvoiceAccessError extends Error {
  readonly statusCode = 403;
  constructor(message = "Access denied: you do not have permission to access or modify this invoice.") {
    super(message);
    this.name = "ForbiddenInvoiceAccessError";
  }
}

/**
 * Validates that an active server session exists and returns the merchant identifier.
 * Throws UnauthorizedError if unauthenticated.
 */
export function requireAuthenticatedMerchant(session: SessionData): {
  merchantId: string;
  address: `0x${string}`;
} {
  if (!session.merchantId || !session.address) {
    throw new UnauthorizedError();
  }
  return {
    merchantId: session.merchantId,
    address: session.address,
  };
}

/**
 * IDOR Protection Guard:
 * Asserts that the requested invoice belongs to the currently authenticated merchant.
 * Prevents horizontal privilege escalation where Merchant A accesses Merchant B's private invoices.
 */
export function assertInvoiceOwnership(
  invoice: { merchantId: string; [key: string]: unknown },
  authenticatedMerchantId: string
): void {
  if (!invoice.merchantId || invoice.merchantId !== authenticatedMerchantId) {
    throw new ForbiddenInvoiceAccessError();
  }
}

/**
 * Checks whether the given merchant has permission to modify an invoice.
 */
export function canAccessInvoice(
  invoiceMerchantId: string,
  sessionMerchantId?: string
): boolean {
  if (!sessionMerchantId) return false;
  return invoiceMerchantId === sessionMerchantId;
}
