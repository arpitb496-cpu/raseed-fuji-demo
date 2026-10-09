import { describe, it, expect } from "vitest";
import {
  requireAuthenticatedMerchant,
  assertInvoiceOwnership,
  canAccessInvoice,
  UnauthorizedError,
  ForbiddenInvoiceAccessError,
} from "@/lib/auth/authorization";

describe("Authorization & IDOR Protection Tests", () => {
  const merchantA = {
    id: "merchant_cm001_alice",
    address: "0x1111111111111111111111111111111111111111" as const,
  };

  const merchantB = {
    id: "merchant_cm002_bob",
    address: "0x2222222222222222222222222222222222222222" as const,
  };

  const invoiceOwnedByA = {
    id: "inv_001",
    publicId: "raseed_pub_abc123xyz789",
    merchantId: merchantA.id,
    title: "Web Development Services",
    amountUsdc: 500_000_000n, // 500 USDC
  };

  const invoiceOwnedByB = {
    id: "inv_002",
    publicId: "raseed_pub_def456uvw123",
    merchantId: merchantB.id,
    title: "Security Audit Q3",
    amountUsdc: 2_000_000_000n, // 2000 USDC
  };

  describe("Session Authentication Enforcement", () => {
    it("fails with UnauthorizedError if session has no merchantId", () => {
      const emptySession = {};
      expect(() => requireAuthenticatedMerchant(emptySession)).toThrow(UnauthorizedError);
    });

    it("fails with UnauthorizedError if session has address but no merchantId", () => {
      const partialSession = { address: merchantA.address };
      expect(() => requireAuthenticatedMerchant(partialSession)).toThrow(UnauthorizedError);
    });

    it("succeeds when session is valid and authenticated", () => {
      const validSession = { merchantId: merchantA.id, address: merchantA.address };
      const res = requireAuthenticatedMerchant(validSession);
      expect(res.merchantId).toBe(merchantA.id);
      expect(res.address).toBe(merchantA.address);
    });
  });

  describe("IDOR Protection: Horizontal Privilege Escalation Prevention", () => {
    it("permits merchant A to access their own invoice", () => {
      expect(() => {
        assertInvoiceOwnership(invoiceOwnedByA, merchantA.id);
      }).not.toThrow();

      expect(canAccessInvoice(invoiceOwnedByA.merchantId, merchantA.id)).toBe(true);
    });

    it("strictly blocks merchant B from accessing merchant A's invoice (IDOR Attack)", () => {
      expect(() => {
        assertInvoiceOwnership(invoiceOwnedByA, merchantB.id);
      }).toThrow(ForbiddenInvoiceAccessError);

      expect(canAccessInvoice(invoiceOwnedByA.merchantId, merchantB.id)).toBe(false);
    });

    it("strictly blocks merchant A from modifying merchant B's invoice", () => {
      expect(() => {
        assertInvoiceOwnership(invoiceOwnedByB, merchantA.id);
      }).toThrow(ForbiddenInvoiceAccessError);

      expect(canAccessInvoice(invoiceOwnedByB.merchantId, merchantA.id)).toBe(false);
    });

    it("denies unauthenticated callers from invoice ownership check", () => {
      expect(canAccessInvoice(invoiceOwnedByA.merchantId, undefined)).toBe(false);
    });
  });
});
