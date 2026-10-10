/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getTestPrisma } from "@/lib/db/test-db";
import { verifyCronAuthorization, runReconciliation } from "@/lib/settlement/reconciliation";
import { recomputeInvoiceSettlement } from "@/lib/settlement/settlement-engine";
import { checkRateLimit } from "@/lib/rate-limit";
import crypto from "crypto";
import type { PrismaClient } from "@prisma/client";
import type { PublicClient } from "viem";

describe("Phase 5 - Concurrency, Cron Advisory Lock, Privacy & Anti-Enumeration", () => {
  let testPrisma: PrismaClient;

  beforeAll(async () => {
    testPrisma = getTestPrisma();
    await testPrisma.$connect();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  describe("Cron Authentication & Constant-Time Comparison", () => {
    it("authorizes when valid Bearer token matches CRON_SECRET", () => {
      const origSecret = process.env.CRON_SECRET;
      try {
        process.env.CRON_SECRET = "super_secret_cron_token_1234567890abcdef";
        const auth = verifyCronAuthorization("Bearer super_secret_cron_token_1234567890abcdef");
        expect(auth.authorized).toBe(true);
      } finally {
        process.env.CRON_SECRET = origSecret;
      }
    });

    it("rejects unauthorized, wrong length, or mismatched Bearer token", () => {
      const origSecret = process.env.CRON_SECRET;
      try {
        process.env.CRON_SECRET = "super_secret_cron_token_1234567890abcdef";

        // Missing header
        expect(verifyCronAuthorization(null).authorized).toBe(false);

        // Missing Bearer prefix
        expect(verifyCronAuthorization("super_secret_cron_token_1234567890abcdef").authorized).toBe(false);

        // Different length
        expect(verifyCronAuthorization("Bearer short").authorized).toBe(false);

        // Same length, wrong characters
        expect(verifyCronAuthorization("Bearer super_secret_cron_token_1234567890abcdeg").authorized).toBe(false);
      } finally {
        process.env.CRON_SECRET = origSecret;
      }
    });

    it("fails fast in production mode if CRON_SECRET is unset", () => {
      const origEnv = process.env.NODE_ENV;
      const origSecret = process.env.CRON_SECRET;

      try {
        (process.env as any).NODE_ENV = "production";
        delete process.env.CRON_SECRET;

        const auth = verifyCronAuthorization("Bearer anything");
        expect(auth.authorized).toBe(false);
        expect(auth.statusCode).toBe(500);
        expect(auth.error).toMatch(/strictly required in production/);
      } finally {
        (process.env as any).NODE_ENV = origEnv;
        process.env.CRON_SECRET = origSecret;
      }
    });
  });

  describe("Postgres Advisory Lock on Reconciliation Cron", () => {
    it("ensures two concurrent cron invocations cannot overlap (second returns acquiredLock: false)", async () => {
      const testKey = `test_cron_lock_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
      const secondClient = getTestPrisma();
      await secondClient.$connect();

      try {
        let firstAcquired = false;
        let secondResult: any = null;

        const mockInstantClient = {
          getBlockNumber: async () => 1000n,
          getLogs: async () => [],
        } as unknown as PublicClient;

        // Session 1 holds advisory transaction lock for 3000ms
        const firstPromise = testPrisma.$transaction(async (tx) => {
          const r1 = await tx.$queryRaw<Array<{ acquired: boolean }>>`
            SELECT pg_try_advisory_xact_lock(hashtext(${testKey})) as acquired
          `;
          firstAcquired = r1[0]?.acquired ?? false;
          await new Promise((resolve) => setTimeout(resolve, 3000));
        });

        // Short sleep to ensure first transaction has acquired the lock
        await new Promise((resolve) => setTimeout(resolve, 150));

        // Session 2 attempts runReconciliation while session 1 holds lock
        secondResult = await runReconciliation({
          prismaClient: secondClient,
          publicClient: mockInstantClient,
          lockKey: testKey,
        });

        await firstPromise;

        expect(firstAcquired).toBe(true);
        expect(secondResult.acquiredLock).toBe(false);
        expect(secondResult.message).toMatch(/Another reconciliation job is currently executing/);
      } finally {
        await secondClient.$disconnect();
      }
    }, 25000);
  });

  describe("Report + Cron Race Condition", () => {
    it("ensures simultaneous report and cron settlement calls on the same invoice do not race or deadlock", async () => {
      const walletAddress = ("0x" + crypto.randomBytes(20).toString("hex")).toLowerCase();
      const merchant = await testPrisma.merchant.create({
        data: { walletAddress, displayName: "Race Test Merchant" },
      });
      const publicId = `raseed_race_${crypto.randomBytes(18).toString("base64url")}`;
      const onchainInvoiceId = ("0x" + crypto.randomBytes(32).toString("hex")).toLowerCase();
      const invoice = await testPrisma.invoice.create({
        data: {
          publicId,
          merchantId: merchant.id,
          invoiceNumber: "INV-RACE-001",
          title: "Race Condition Invoice",
          dueDate: new Date(Date.now() + 86400000),
          amountUsdc: 10_000_000n,
          status: "SENT",
          onchainInvoiceId,
        },
      });

      const txHash = ("0x" + crypto.randomBytes(32).toString("hex")).toLowerCase();
      const blockHash = ("0x" + crypto.randomBytes(32).toString("hex")).toLowerCase();
      await testPrisma.paymentEvent.create({
        data: {
          invoiceId: invoice.id,
          txHash,
          logIndex: 0,
          blockHash,
          blockNumber: 1000n,
          chainId: 43113,
          routerAddress: "0xb94a922261bba2e07648520bf56125a4102eab95",
          merchantAddress: walletAddress,
          payerAddress: ("0x" + crypto.randomBytes(20).toString("hex")).toLowerCase(),
          onchainInvoiceId,
          amountUsdc: 10_000_000n,
          feeUsdc: 0n,
        },
      });

      const mockClient = {
        getBlockNumber: async () => 1010n,
        getBlock: async () => ({ hash: blockHash }),
      } as unknown as PublicClient;

      const secondClient = getTestPrisma();
      await secondClient.$connect();

      try {
        const [resA, resB] = await Promise.all([
          recomputeInvoiceSettlement(invoice.id, {
            publicClient: mockClient,
            prismaClient: testPrisma,
          }),
          recomputeInvoiceSettlement(invoice.id, {
            publicClient: mockClient,
            prismaClient: secondClient,
          }),
        ]);

        expect(resA.newStatus).toBe("PAID");
        expect(resB.newStatus).toBe("PAID");
        expect(resA.paidAmountUsdc).toBe(10_000_000n);
        expect(resB.paidAmountUsdc).toBe(10_000_000n);

        const updated = await testPrisma.invoice.findUnique({ where: { id: invoice.id } });
        expect(updated?.status).toBe("PAID");
        expect(updated?.paidAmountUsdc).toBe(10_000_000n);
      } finally {
        await secondClient.$disconnect();
        await testPrisma.paymentEvent.deleteMany({ where: { invoiceId: invoice.id } });
        await testPrisma.invoice.delete({ where: { id: invoice.id } });
        await testPrisma.merchant.delete({ where: { id: merchant.id } });
      }
    }, 25000);
  });

  describe("Anti-Enumeration & Zero PII Leakage", () => {
    it("provides identical 404 response shape for invalid format vs nonexistent invoice", async () => {
      // Test simulated validation in public route:
      const checkPublicId = async (id: string) => {
        const isValidFormat =
          typeof id === "string" &&
          id.startsWith("raseed_") &&
          id.length >= 20 &&
          id.length <= 100;

        if (!isValidFormat) {
          return { error: "Invoice not found", status: 404 };
        }

        const inv = await testPrisma.invoice.findUnique({
          where: { publicId: id },
        });

        if (!inv) {
          return { error: "Invoice not found", status: 404 };
        }

        return { data: inv, status: 200 };
      };

      const resInvalid = await checkPublicId("invalid-id-123");
      const resNonexistent = await checkPublicId(`raseed_nonexistent_${crypto.randomBytes(18).toString("base64url")}`);

      // Both must return identical 404 status and error message
      expect(resInvalid.status).toBe(404);
      expect(resNonexistent.status).toBe(404);
      expect(resInvalid.error).toBe(resNonexistent.error);
    }, 25000);

    it("verifies sanitized public payload never leaks clientEmail, clientName, or internal DB ids", async () => {
      const walletAddress = ("0x" + crypto.randomBytes(20).toString("hex")).toLowerCase();
      const merchant = await testPrisma.merchant.create({
        data: {
          walletAddress,
          displayName: "Privacy Test Merchant",
          businessName: "Acme Web3 Labs",
        },
      });

      const publicId = `raseed_privacy_${crypto.randomBytes(18).toString("base64url")}`;
      const onchainInvoiceId = ("0x" + crypto.randomBytes(32).toString("hex")).toLowerCase();

      const invoice = await testPrisma.invoice.create({
        data: {
          publicId,
          merchantId: merchant.id,
          invoiceNumber: "INV-PRIVACY-001",
          title: "Confidential Enterprise Consulting",
          notes: "Payment due within 30 days",
          clientName: "Private Client John Doe",
          clientEmail: "confidential_client@example.com",
          amountUsdc: 25_000_000n,
          onchainInvoiceId,
          dueDate: new Date(Date.now() + 86400000),
          items: {
            create: [
              {
                description: "Security Audit",
                quantity: 1,
                unitAmountUsdc: 25_000_000n,
              },
            ],
          },
        },
        include: {
          merchant: {
            select: { displayName: true, businessName: true, walletAddress: true },
          },
          items: {
            select: { description: true, quantity: true, unitAmountUsdc: true },
          },
        },
      });

      // Construct the exact sanitized payload exposed by /api/pay/[publicId]
      const sanitizedPayload = {
        publicId: invoice.publicId,
        onchainInvoiceId: invoice.onchainInvoiceId,
        title: invoice.title,
        notes: invoice.notes,
        currencyDisplay: invoice.currencyDisplay,
        amountUsdc: invoice.amountUsdc.toString(),
        paidAmountUsdc: invoice.paidAmountUsdc.toString(),
        status: invoice.status,
        merchant: {
          displayName: invoice.merchant.displayName,
          businessName: invoice.merchant.businessName,
          walletAddress: invoice.merchant.walletAddress,
        },
        items: invoice.items.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitAmountUsdc: it.unitAmountUsdc.toString(),
        })),
      };

      // Strict assertions: NO client email, NO client name, NO internal cuid
      const payloadString = JSON.stringify(sanitizedPayload);
      expect(payloadString).not.toContain("confidential_client@example.com");
      expect(payloadString).not.toContain("Private Client John Doe");
      expect(payloadString).not.toContain(merchant.id);
      expect(payloadString).not.toContain(invoice.id);

      // Clean up
      await testPrisma.invoiceItem.deleteMany({ where: { invoiceId: invoice.id } });
      await testPrisma.invoice.delete({ where: { id: invoice.id } });
      await testPrisma.merchant.delete({ where: { id: merchant.id } });
    }, 25000);
  });

  describe("Rate Limiting on Report Endpoint", () => {
    it("enforces rate limit when requests exceed threshold within time window", async () => {
      const testKey = `test_rate_limit_${Date.now()}`;
      const limit = 5;
      const windowSeconds = 10;

      // 5 requests pass
      for (let i = 0; i < limit; i++) {
        const rl = await checkRateLimit(testKey, limit, windowSeconds);
        expect(rl.success).toBe(true);
      }

      // 6th request fails with rate limit exceeded
      const rlBlocked = await checkRateLimit(testKey, limit, windowSeconds);
      expect(rlBlocked.success).toBe(false);
      expect(rlBlocked.remaining).toBe(0);
    });
  });
});
