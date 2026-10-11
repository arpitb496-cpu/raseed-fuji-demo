import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { verifyRequestOrigin } from "@/lib/auth/csrf";
import { prisma } from "@/lib/db";

// Hoisted mocks for internal error simulation
vi.mock("@/lib/auth/session", () => ({
  getServerSession: async () => ({
    merchantId: "merchant_test_123",
    address: "0x1111111111111111111111111111111111111111",
  }),
}));

const mockReconcile = vi.fn();
vi.mock("@/lib/settlement/reconciliation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/settlement/reconciliation")>();
  return {
    ...actual,
    runReconciliation: () => mockReconcile(),
  };
});

describe("API Security & Error Sanitization", () => {
  describe("CSRF / Origin Verification", () => {
    it("permits safe HTTP methods (GET, HEAD, OPTIONS) unconditionally", () => {
      const getReq = new NextRequest("http://localhost:3000/api/invoices", {
        method: "GET",
      });
      expect(verifyRequestOrigin(getReq).valid).toBe(true);
    });

    it("permits state-changing requests when Origin matches Host", () => {
      const postReq = new NextRequest("http://localhost:3000/api/invoices", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin: "http://localhost:3000",
        },
      });
      expect(verifyRequestOrigin(postReq).valid).toBe(true);
    });

    it("rejects state-changing requests from a mismatched Origin (cross-origin attack)", () => {
      const evilReq = new NextRequest("http://localhost:3000/api/invoices", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin: "https://evil-attacker.example.com",
        },
      });
      const check = verifyRequestOrigin(evilReq);
      expect(check.valid).toBe(false);
      expect(check.reason).toContain("Origin does not match request host");
    });

    it("permits state-changing requests when Referer matches Host if Origin is absent", () => {
      const refererReq = new NextRequest("http://localhost:3000/api/invoices", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          referer: "http://localhost:3000/app/invoices/new",
        },
      });
      expect(verifyRequestOrigin(refererReq).valid).toBe(true);
    });

    it("rejects state-changing requests when Referer is cross-origin", () => {
      const evilRefererReq = new NextRequest("http://localhost:3000/api/invoices", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          referer: "https://evil-attacker.example.com/phish",
        },
      });
      const check = verifyRequestOrigin(evilRefererReq);
      expect(check.valid).toBe(false);
      expect(check.reason).toContain("Referer does not match request host");
    });
  });

  describe("Internal Error Sanitization (Zero Leaks)", () => {
    it("returns a generic 500 without stack traces, Prisma internals, or RPC URLs when DB fails in /api/invoices", async () => {
      // Simulate a Prisma crash that includes sensitive SQL / DB connection info
      const prismaSpy = vi.spyOn(prisma.invoice, "findMany").mockRejectedValueOnce(
        new Error("PrismaClientKnownRequestError: Can't reach database server at postgresql://user:super_secret_pw@db.internal:5432/db")
      );

      const { GET } = await import("@/app/api/invoices/route");
      const req = new NextRequest("http://localhost:3000/api/invoices", {
        method: "GET",
      });

      const res = await GET(req);
      expect(res.status).toBe(500);

      const body = await res.json();
      expect(body).toEqual({ error: "Failed to fetch invoices" });

      // Explicit assertions that sensitive details were completely scrubbed
      const rawText = JSON.stringify(body);
      expect(rawText).not.toContain("Prisma");
      expect(rawText).not.toContain("postgresql://");
      expect(rawText).not.toContain("super_secret_pw");
      expect(rawText).not.toContain("stack");

      prismaSpy.mockRestore();
    });

    it("returns generic 500 without RPC URLs or secret leakage in /api/cron/reconcile", async () => {
      const { GET } = await import("@/app/api/cron/reconcile/route");
      const origSecret = process.env.CRON_SECRET;
      process.env.CRON_SECRET = "test_cron_secret_123";

      mockReconcile.mockRejectedValueOnce(
        new Error("RPC failed: https://avalanche-fuji.infura.io/v3/SECRET_KEY connection timed out at BlockFetcher.ts:42")
      );

      const req = new NextRequest("http://localhost:3000/api/cron/reconcile", {
        method: "GET",
        headers: {
          authorization: "Bearer test_cron_secret_123",
        },
      });

      const res = await GET(req);
      expect(res.status).toBe(500);

      const body = await res.json();
      expect(body).toEqual({ error: "Internal error executing reconciliation cron" });

      const rawText = JSON.stringify(body);
      expect(rawText).not.toContain("SECRET_KEY");
      expect(rawText).not.toContain("infura.io");
      expect(rawText).not.toContain("BlockFetcher");

      process.env.CRON_SECRET = origSecret;
    });
  });
});
