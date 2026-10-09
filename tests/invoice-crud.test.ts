import { describe, it, expect } from "vitest";
import {
  generateUnguessablePublicId,
  deriveOnchainInvoiceId,
  formatInvoiceNumber,
  evaluateInvoiceStatus,
  escapeCsvCell,
} from "@/lib/invoice-utils";
import { assertInvoiceOwnership, ForbiddenInvoiceAccessError } from "@/lib/auth/authorization";

describe("Phase 4: Invoice Utilities, Security & Status Transitions", () => {
  describe("publicId & onchainInvoiceId Generation", () => {
    it("generates unguessable publicId with >= 22 characters", () => {
      const id1 = generateUnguessablePublicId();
      const id2 = generateUnguessablePublicId();

      expect(id1.length).toBeGreaterThanOrEqual(22);
      expect(id2.length).toBeGreaterThanOrEqual(22);
      expect(id1).not.toBe(id2);
      // URL-safe charset
      expect(/^[a-zA-Z0-9_-]+$/.test(id1)).toBe(true);
    });

    it("derives deterministic 32-byte onchainInvoiceId using keccak256", () => {
      const publicId = "abc123xyz789def456uvw012";
      const hash1 = deriveOnchainInvoiceId(publicId);
      const hash2 = deriveOnchainInvoiceId(publicId);

      expect(hash1).toBe(hash2);
      expect(hash1.startsWith("0x")).toBe(true);
      expect(hash1.length).toBe(66); // 0x + 64 hex chars = 32 bytes

      // Different publicId produces different onchain hash
      const hash3 = deriveOnchainInvoiceId("differentPublicId12345678");
      expect(hash1).not.toBe(hash3);
    });

    it("formats sequential invoice numbers with standard padding", () => {
      expect(formatInvoiceNumber(1)).toBe("INV-0001");
      expect(formatInvoiceNumber(42)).toBe("INV-0042");
      expect(formatInvoiceNumber(9999)).toBe("INV-9999");
      expect(formatInvoiceNumber(10005)).toBe("INV-10005");
    });
  });

  describe("Status Transitions & Evaluation", () => {
    const futureDate = new Date(Date.now() + 86400000 * 7); // 7 days in future
    const pastDate = new Date(Date.now() - 86400000 * 2); // 2 days in past

    it("evaluates DRAFT status correctly", () => {
      expect(evaluateInvoiceStatus("DRAFT", futureDate)).toBe("DRAFT");
      // Overdue draft becomes EXPIRED
      expect(evaluateInvoiceStatus("DRAFT", pastDate)).toBe("EXPIRED");
    });

    it("evaluates SENT status correctly", () => {
      expect(evaluateInvoiceStatus("SENT", futureDate)).toBe("SENT");
      // Overdue sent invoice becomes EXPIRED
      expect(evaluateInvoiceStatus("SENT", pastDate)).toBe("EXPIRED");
    });

    it("preserves PAID status even when past due date", () => {
      expect(evaluateInvoiceStatus("PAID", pastDate)).toBe("PAID");
      expect(evaluateInvoiceStatus("PAID", futureDate)).toBe("PAID");
    });

    it("preserves CANCELLED status permanently", () => {
      expect(evaluateInvoiceStatus("CANCELLED", pastDate)).toBe("CANCELLED");
      expect(evaluateInvoiceStatus("CANCELLED", futureDate)).toBe("CANCELLED");
    });
  });

  describe("CSV Formula Injection Mitigation", () => {
    it("escapes formula injection vectors starting with =, +, -, @, \\t, \\r", () => {
      // Direct Excel/Sheets executable formulas
      const equalPayload = "=cmd|' /C calc'!A0";
      const escapedEqual = escapeCsvCell(equalPayload);
      expect(escapedEqual).toBe(`"'=cmd|' /C calc'!A0"`);

      const plusPayload = "+1+1";
      const escapedPlus = escapeCsvCell(plusPayload);
      expect(escapedPlus).toBe(`"'+1+1"`);

      const minusPayload = "-2+3";
      const escapedMinus = escapeCsvCell(minusPayload);
      expect(escapedMinus).toBe(`"'-2+3"`);

      const atPayload = "@SUM(A1:A10)";
      const escapedAt = escapeCsvCell(atPayload);
      expect(escapedAt).toBe(`"'@SUM(A1:A10)"`);

      const tabPayload = "\t=1+1";
      const escapedTab = escapeCsvCell(tabPayload);
      expect(escapedTab.startsWith(`"'\t`)).toBe(true);
    });

    it("escapes embedded double quotes by doubling them", () => {
      const textWithQuotes = 'Software "Consulting" & Audit';
      const escaped = escapeCsvCell(textWithQuotes);
      expect(escaped).toBe('"Software ""Consulting"" & Audit"');
    });

    it("leaves normal safe values unescaped without prepending '", () => {
      expect(escapeCsvCell("Normal Invoice Title")).toBe("Normal Invoice Title");
      expect(escapeCsvCell(1250)).toBe("1250");
      expect(escapeCsvCell("INV-0001")).toBe("INV-0001");
      expect(escapeCsvCell("")).toBe("");
      expect(escapeCsvCell(null)).toBe("");
      expect(escapeCsvCell(undefined)).toBe("");
    });
  });

  describe("IDOR Protection & Authorization Isolation", () => {
    const merchantA_Id = "merchant_alice_001";
    const merchantB_Id = "merchant_bob_002";

    const invoiceB = {
      id: "inv_bob_99",
      publicId: "pub_bob_invoice_secure",
      merchantId: merchantB_Id,
      title: "Confidential Consulting",
      amountUsdc: 1_000_000_000n, // 1000 USDC
      status: "SENT" as const,
    };

    it("blocks Merchant A from reading or modifying Merchant B's invoice", () => {
      expect(() => {
        assertInvoiceOwnership(invoiceB, merchantA_Id);
      }).toThrow(ForbiddenInvoiceAccessError);
    });

    it("blocks unauthenticated callers from accessing any invoice", () => {
      expect(() => {
        assertInvoiceOwnership(invoiceB, "");
      }).toThrow(ForbiddenInvoiceAccessError);
    });

    it("allows Merchant B to manage their own invoice", () => {
      expect(() => {
        assertInvoiceOwnership(invoiceB, merchantB_Id);
      }).not.toThrow();
    });
  });
});
