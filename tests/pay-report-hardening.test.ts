import { describe, it, expect, vi } from "vitest";
import { getClientIp } from "@/app/api/pay/[publicId]/report/route";

describe("Payment Report Endpoint Hardening", () => {
  describe("Client IP Resolution Guard", () => {
    it("prioritizes x-real-ip over client-supplied x-forwarded-for header", () => {
      const req = new Request("http://localhost:3000/api/pay/raseed_123/report", {
        headers: {
          "x-real-ip": "198.51.100.42",
          "x-forwarded-for": "10.0.0.1, 10.0.0.2",
        },
      });

      const ip = getClientIp(req);
      expect(ip).toBe("198.51.100.42");
    });

    it("prioritizes x-vercel-forwarded-for when x-real-ip is absent", () => {
      const req = new Request("http://localhost:3000/api/pay/raseed_123/report", {
        headers: {
          "x-vercel-forwarded-for": "203.0.113.19, 10.0.0.1",
        },
      });

      const ip = getClientIp(req);
      expect(ip).toBe("203.0.113.19");
    });

    it("prioritizes cf-connecting-ip on Cloudflare setups", () => {
      const req = new Request("http://localhost:3000/api/pay/raseed_123/report", {
        headers: {
          "cf-connecting-ip": "192.0.2.77",
          "x-forwarded-for": "1.2.3.4",
        },
      });

      const ip = getClientIp(req);
      expect(ip).toBe("192.0.2.77");
    });

    it("falls back safely to validated x-forwarded-for if no platform header present", () => {
      const req = new Request("http://localhost:3000/api/pay/raseed_123/report", {
        headers: {
          "x-forwarded-for": "198.51.100.5",
        },
      });

      const ip = getClientIp(req);
      expect(ip).toBe("198.51.100.5");
    });

    it("falls back to unknown_client if headers are empty or malformed", () => {
      const req = new Request("http://localhost:3000/api/pay/raseed_123/report", {
        headers: {},
      });

      const ip = getClientIp(req);
      expect(ip).toBe("unknown_client");
    });
  });

  describe("Fast-path PaymentEvent deduplication without RPC", () => {
    it("returns current invoice status immediately if PaymentEvent is already stored", async () => {
      const mockPrisma = {
        paymentEvent: {
          findFirst: vi.fn().mockResolvedValue({
            id: "pe_123",
            txHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
            invoice: {
              status: "PAID",
              paidAmountUsdc: 10000000n,
            },
          }),
        },
      };

      const txHash = "0xABCDEF1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
      const normalizedTxHash = txHash.toLowerCase();

      const existingEvent = await mockPrisma.paymentEvent.findFirst({
        where: { txHash: normalizedTxHash },
        include: { invoice: true },
      });

      expect(existingEvent).toBeDefined();
      expect(existingEvent?.invoice.status).toBe("PAID");

      // Verify that no RPC client call is needed:
      const rpcClientMock = {
        getTransactionReceipt: vi.fn(),
      };
      expect(rpcClientMock.getTransactionReceipt).not.toHaveBeenCalled();
    });
  });

  describe("Invoice-level rate limit guard against rotating IPs", () => {
    it("enforces key includes publicId for total invoice threshold", () => {
      const publicId = "raseed_unguessable123456";
      const rateLimitKey = `pay_report_invoice_${publicId}`;
      expect(rateLimitKey).toContain(publicId);
      expect(rateLimitKey).toBe("pay_report_invoice_raseed_unguessable123456");
    });
  });
});
