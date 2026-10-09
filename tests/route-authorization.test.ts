/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock prisma and auth session
vi.mock("@/lib/auth/session", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    invoice: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    merchant: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { GET as getInvoice, PATCH as patchInvoice, DELETE as deleteInvoice } from "@/app/api/invoices/[id]/route";
import { GET as getPdf } from "@/app/api/invoices/[id]/pdf/route";
import { GET as exportCsv } from "@/app/api/invoices/export/route";
import { GET as exportMerchantData } from "@/app/api/merchant/export/route";

describe("Phase 4: Route-Level Authorization & IDOR Tests", () => {
  const merchantA = {
    id: "merchant_alice_001",
    walletAddress: "0x1111111111111111111111111111111111111111",
  };

  const merchantB = {
    id: "merchant_bob_002",
    walletAddress: "0x2222222222222222222222222222222222222222",
  };

  const invoiceOwnedByB = {
    id: "inv_bob_secret_42",
    publicId: "pub_bob_invoice_42",
    merchantId: merchantB.id,
    merchant: merchantB,
    title: "Bob Confidential Services",
    amountUsdc: 5000000000n,
    status: "SENT",
    items: [],
    payments: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: Authenticated as Merchant A (Alice)
    vi.mocked(getServerSession).mockResolvedValue({
      merchantId: merchantA.id,
      address: merchantA.walletAddress,
      destroy: vi.fn(),
    } as any);
  });

  describe("GET /api/invoices/[id] (Read Invoice)", () => {
    it("returns 403 Forbidden when Merchant A tries to read Merchant B's invoice", async () => {
      vi.mocked(prisma.invoice.findUnique).mockResolvedValue(invoiceOwnedByB as any);

      const req = new NextRequest("http://localhost:3000/api/invoices/inv_bob_secret_42");
      const res = await getInvoice(req, { params: Promise.resolve({ id: "inv_bob_secret_42" }) });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Access denied");
    });
  });

  describe("PATCH /api/invoices/[id] (Modify / Cancel Invoice)", () => {
    it("returns 403 Forbidden when Merchant A tries to cancel Merchant B's invoice", async () => {
      vi.mocked(prisma.invoice.findUnique).mockResolvedValue(invoiceOwnedByB as any);

      const req = new NextRequest("http://localhost:3000/api/invoices/inv_bob_secret_42", {
        method: "PATCH",
        body: JSON.stringify({ action: "CANCEL" }),
      });
      const res = await patchInvoice(req, { params: Promise.resolve({ id: "inv_bob_secret_42" }) });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Access denied");
      // Ensure no update occurred
      expect(prisma.invoice.update).not.toHaveBeenCalled();
    });
  });

  describe("DELETE /api/invoices/[id] (Delete Invoice)", () => {
    it("returns 403 Forbidden when Merchant A tries to delete Merchant B's invoice", async () => {
      vi.mocked(prisma.invoice.findUnique).mockResolvedValue(invoiceOwnedByB as any);

      const req = new NextRequest("http://localhost:3000/api/invoices/inv_bob_secret_42", {
        method: "DELETE",
      });
      const res = await deleteInvoice(req, { params: Promise.resolve({ id: "inv_bob_secret_42" }) });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Access denied");
      // Ensure no delete occurred
      expect(prisma.invoice.delete).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/invoices/[id]/pdf (Download Invoice PDF)", () => {
    it("returns 403 Forbidden when Merchant A tries to download PDF of Merchant B's invoice", async () => {
      vi.mocked(prisma.invoice.findUnique).mockResolvedValue(invoiceOwnedByB as any);

      const req = new NextRequest("http://localhost:3000/api/invoices/inv_bob_secret_42/pdf");
      const res = await getPdf(req, { params: Promise.resolve({ id: "inv_bob_secret_42" }) });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Access denied");
    });
  });

  describe("GET /api/invoices/export (CSV Export Scope)", () => {
    it("only queries invoices belonging to the authenticated merchant", async () => {
      vi.mocked(prisma.invoice.findMany).mockResolvedValue([]);

      const res = await exportCsv();

      expect(res.status).toBe(200);
      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            merchantId: merchantA.id,
          }),
        })
      );
    });
  });

  describe("GET /api/merchant/export (Full Data JSON Export Scope)", () => {
    it("only queries profile & invoices belonging to the authenticated merchant", async () => {
      vi.mocked(prisma.merchant.findUnique).mockResolvedValue({
        ...merchantA,
        invoices: [],
        auditLogs: [],
      } as any);

      const res = await exportMerchantData();

      expect(res.status).toBe(200);
      expect(prisma.merchant.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: merchantA.id,
          },
        })
      );
    });
  });
});
