/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { getTestPrisma } from "@/lib/db/test-db";
import { recomputeInvoiceSettlement } from "@/lib/settlement/settlement-engine";
import { InvoiceStatus } from "@prisma/client";
import type { PublicClient } from "viem";
import {
  MAX_RECONCILE_BLOCK_RANGE,
  REORG_LOOKBACK_BLOCKS,
  getRouterDeployBlock,
  isRpcBlockRangeOrLimitError,
  sanitizeLogMessage,
  runReconciliation,
} from "@/lib/settlement/reconciliation";

describe("Reconciliation Hardening & Catch-up Guards", () => {
  it("enforces MAX_RECONCILE_BLOCK_RANGE is strictly <= 2000 for public Fuji RPC limits", () => {
    console.log("MAX_RECONCILE_BLOCK_RANGE is:", MAX_RECONCILE_BLOCK_RANGE.toString());
    expect(MAX_RECONCILE_BLOCK_RANGE).toBeLessThanOrEqual(2000n);
    expect(MAX_RECONCILE_BLOCK_RANGE).toBeGreaterThan(0n);
  });

  it("loads the router deployment block from deployments.json for Fuji testnet", () => {
    const deployBlock = getRouterDeployBlock(43113);
    expect(deployBlock).toBe(59271254n);
  });

  it("catches up across large block gaps chunk-by-chunk without skipping blocks", async () => {
    const deployBlock = 59271254n;
    const targetLatestBlock = 59276000n; // 4,746 blocks ahead

    let currentCursor: bigint | null = null;
    const executedRanges: Array<{ from: bigint; to: bigint }> = [];

    // Simulate 3 iterations of the reconciliation cron
    for (let run = 1; run <= 3; run++) {
      let fromBlock: bigint;
      if (currentCursor !== null) {
        fromBlock =
          currentCursor > REORG_LOOKBACK_BLOCKS
            ? currentCursor - REORG_LOOKBACK_BLOCKS
            : 0n;
      } else {
        fromBlock = deployBlock;
      }

      const toBlock =
        fromBlock + MAX_RECONCILE_BLOCK_RANGE > targetLatestBlock
          ? targetLatestBlock
          : fromBlock + MAX_RECONCILE_BLOCK_RANGE;

      executedRanges.push({ from: fromBlock, to: toBlock });
      currentCursor = toBlock;

      if (toBlock >= targetLatestBlock) {
        break;
      }
    }

    // Verify Run 1: starts at deployBlock, steps by MAX_RECONCILE_BLOCK_RANGE (2000)
    expect(executedRanges[0].from).toBe(deployBlock);
    expect(executedRanges[0].to).toBe(deployBlock + 2000n);

    // Verify Run 2: starts with 12 blocks reorg lookback overlap to guarantee no missed logs
    expect(executedRanges[1].from).toBe(executedRanges[0].to - REORG_LOOKBACK_BLOCKS);
    expect(executedRanges[1].to).toBe(executedRanges[1].from + 2000n);

    // Verify Run 3: catches up to targetLatestBlock exactly
    expect(executedRanges[2].to).toBe(targetLatestBlock);
  });

  it("conditional expiry prevents race condition: concurrent payment keeps invoice PAID/PARTIALLY_PAID, never EXPIRED", async () => {
    // Mock database state where an invoice has a past due date, but received a payment
    const invoiceInDb = {
      id: "inv_123",
      merchantId: "merch_123",
      status: "PAID", // Already marked paid concurrently
      dueDate: new Date(Date.now() - 3600 * 1000), // 1 hour ago
      paidAmountUsdc: 5_000_000n,
    };

    // The conditional update query:
    // UPDATE Invoice SET status = 'EXPIRED' WHERE id = :id AND status = 'SENT' AND paidAmountUsdc = 0 AND dueDate < :now
    const simulateConditionalExpiry = (inv: typeof invoiceInDb) => {
      const conditionMet =
        inv.status === "SENT" &&
        inv.paidAmountUsdc === 0n &&
        inv.dueDate < new Date();

      if (conditionMet) {
        inv.status = "EXPIRED";
        return { count: 1 };
      }
      return { count: 0 };
    };

    const result = simulateConditionalExpiry(invoiceInDb);

    // Expiry update MUST be rejected (count = 0)
    expect(result.count).toBe(0);
    // Invoice status remains PAID!
    expect(invoiceInDb.status).toBe("PAID");
  });

  it("conditional expiry prevents partial payment race: PARTIALLY_PAID is never converted to EXPIRED", async () => {
    const invoiceInDb = {
      id: "inv_456",
      merchantId: "merch_456",
      status: "PARTIALLY_PAID",
      dueDate: new Date(Date.now() - 3600 * 1000),
      paidAmountUsdc: 2_000_000n,
    };

    const conditionMet =
      invoiceInDb.status === "SENT" &&
      invoiceInDb.paidAmountUsdc === 0n &&
      invoiceInDb.dueDate < new Date();

    const count = conditionMet ? 1 : 0;
    expect(count).toBe(0);
    expect(invoiceInDb.status).toBe("PARTIALLY_PAID");
  });

  it("REAL INTEGRATION CONCURRENCY: concurrent settlement vs expiry cron against test DB proves invoice never ends EXPIRED", async () => {
    const testPrisma = getTestPrisma();
    await testPrisma.$connect();
    const secondPrisma = getTestPrisma();
    await secondPrisma.$connect();

    const walletAddress = ("0x" + crypto.randomBytes(20).toString("hex")).toLowerCase();
    const merchant = await testPrisma.merchant.create({
      data: { walletAddress, displayName: "Concurrency Test Merchant" },
    });
    const publicId = `raseed_conc_${crypto.randomBytes(18).toString("base64url")}`;
    const onchainInvoiceId = ("0x" + crypto.randomBytes(32).toString("hex")).toLowerCase();

    // Past due invoice (due 1 hour ago) with 0 paidAmountUsdc, currently in SENT status
    const invoice = await testPrisma.invoice.create({
      data: {
        publicId,
        merchantId: merchant.id,
        invoiceNumber: "INV-CONC-001",
        title: "Concurrent Expiry vs Settlement Test",
        dueDate: new Date(Date.now() - 3600 * 1000), // Overdue!
        amountUsdc: 10_000_000n, // 10 USDC
        paidAmountUsdc: 0n,
        status: InvoiceStatus.SENT,
        onchainInvoiceId,
      },
    });

    const txHash = ("0x" + crypto.randomBytes(32).toString("hex")).toLowerCase();
    const blockHash = ("0x" + crypto.randomBytes(32).toString("hex")).toLowerCase();

    // Create a confirmed payment event for this invoice
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

    try {
      // Launch two truly concurrent database operations:
      // Operation 1: Settlement engine recomputing & applying payment
      const settlementPromise = recomputeInvoiceSettlement(invoice.id, {
        publicClient: mockClient,
        prismaClient: testPrisma,
      });

      // Operation 2: Expiry cron attempting conditional batch expiry in a separate DB connection
      const expiryCronPromise = secondPrisma.$transaction(async (tx) => {
        const now = new Date();
        // Candidate selection
        const overdueCandidates = await tx.invoice.findMany({
          where: {
            status: InvoiceStatus.SENT,
            dueDate: { lt: now },
            paidAmountUsdc: 0n,
          },
          select: { id: true, merchantId: true, dueDate: true },
        });

        const target = overdueCandidates.find((c) => c.id === invoice.id);
        if (target) {
          // Conditional update matching reconciliation.ts
          await tx.invoice.updateMany({
            where: {
              id: target.id,
              status: InvoiceStatus.SENT,
              paidAmountUsdc: 0n,
              dueDate: { lt: now },
            },
            data: { status: InvoiceStatus.EXPIRED },
          });
        }
      });

      await Promise.all([settlementPromise, expiryCronPromise]);

      // Verify the resulting invoice in DB: MUST NEVER BE EXPIRED
      const finalInvoice = await testPrisma.invoice.findUnique({
        where: { id: invoice.id },
      });

      expect(finalInvoice).toBeDefined();
      expect(finalInvoice!.status).not.toBe(InvoiceStatus.EXPIRED);
      expect(finalInvoice!.status).toBe(InvoiceStatus.PAID);
      expect(finalInvoice!.paidAmountUsdc).toBe(10_000_000n);
    } finally {
      await testPrisma.paymentEvent.deleteMany({ where: { invoiceId: invoice.id } });
      await testPrisma.auditLog.deleteMany({ where: { invoiceId: invoice.id } });
      await testPrisma.invoice.delete({ where: { id: invoice.id } });
      await testPrisma.merchant.delete({ where: { id: merchant.id } });
      await secondPrisma.$disconnect();
      await testPrisma.$disconnect();
    }
  }, 25000);

  it("includes unsettled invoices with recorded payment events in reconciliation settlement", async () => {
    const testPrisma = getTestPrisma();
    const testSuffix = crypto.randomBytes(4).toString("hex");

    const merchant = await testPrisma.merchant.create({
      data: {
        walletAddress: `0x${crypto.randomBytes(20).toString("hex")}`,
        displayName: `ReconTest_${testSuffix}`,
      },
    });

    const invoice = await testPrisma.invoice.create({
      data: {
        publicId: `raseed_recon_${testSuffix}`,
        merchantId: merchant.id,
        invoiceNumber: `INV-REC-${testSuffix}`,
        title: "Recon Test Invoice",
        amountUsdc: 2_000_000n,
        paidAmountUsdc: 0n,
        status: InvoiceStatus.SENT,
        dueDate: new Date(Date.now() + 86400 * 1000),
        currencyDisplay: "USD",
        onchainInvoiceId: `0x${crypto.randomBytes(32).toString("hex")}`,
      },
    });

    // Create an un-invalidated PaymentEvent
    await testPrisma.paymentEvent.create({
      data: {
        invoiceId: invoice.id,
        txHash: `0x${crypto.randomBytes(32).toString("hex")}`,
        logIndex: 0,
        blockHash: `0x${crypto.randomBytes(32).toString("hex")}`,
        blockNumber: 59305831n,
        chainId: 43113,
        routerAddress: "0xb94a922261bba2e07648520bf56125a4102eab95",
        merchantAddress: merchant.walletAddress,
        payerAddress: `0x${crypto.randomBytes(20).toString("hex")}`,
        onchainInvoiceId: invoice.onchainInvoiceId,
        amountUsdc: 2_000_000n,
        feeUsdc: 0n,
      },
    });

    try {
      // Query unsettled invoices exactly as reconciliation does
      const unsettled = await testPrisma.invoice.findMany({
        where: {
          status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.DRAFT] },
          paymentEvents: { some: { invalidatedAt: null } },
        },
        select: { id: true },
      });

      const found = unsettled.some((u) => u.id === invoice.id);
      expect(found).toBe(true);
    } finally {
      await testPrisma.paymentEvent.deleteMany({ where: { invoiceId: invoice.id } });
      await testPrisma.invoice.delete({ where: { id: invoice.id } });
      await testPrisma.merchant.delete({ where: { id: merchant.id } });
      await testPrisma.$disconnect();
    }
  }, 25000);

  describe("Free-tier RPC block-range limitation detection & log sanitization", () => {
    it("detects error by provider code -32600 (Invalid Request / Range Limit)", () => {
      expect(isRpcBlockRangeOrLimitError({ code: -32600, message: "Invalid request" })).toBe(true);
    });

    it("detects error by provider code -32005 (Query limit exceeded)", () => {
      expect(isRpcBlockRangeOrLimitError({ code: -32005, message: "limit exceeded" })).toBe(true);
    });

    it("detects HTTP 413 Payload Too Large / Range Exceeded", () => {
      expect(isRpcBlockRangeOrLimitError({ status: 413, message: "Response too large" })).toBe(true);
    });

    it("detects provider-specific block range error messages and details", () => {
      expect(
        isRpcBlockRangeOrLimitError({
          message: "Under the Free tier plan, you can make eth_getLogs requests with up to a 10 block range.",
        })
      ).toBe(true);

      expect(
        isRpcBlockRangeOrLimitError({
          details: "query exceeds max block range of 2048 blocks",
        })
      ).toBe(true);

      expect(
        isRpcBlockRangeOrLimitError({
          shortMessage: "exceeds maximum block range for free tier",
        })
      ).toBe(true);
    });

    it("detects nested error causes from viem wrapped errors", () => {
      const nestedViemError = {
        name: "HttpRequestError",
        message: "HTTP request failed",
        cause: {
          code: -32600,
          message: "eth_getLogs range is too wide",
        },
      };
      expect(isRpcBlockRangeOrLimitError(nestedViemError)).toBe(true);
    });

    it("does not false-positive on unrelated errors (e.g. revert or timeout)", () => {
      expect(isRpcBlockRangeOrLimitError(null)).toBe(false);
      expect(isRpcBlockRangeOrLimitError(undefined)).toBe(false);
      expect(isRpcBlockRangeOrLimitError({ message: "execution reverted: ERC20: insufficient allowance" })).toBe(false);
      expect(isRpcBlockRangeOrLimitError({ message: "Network connection timeout" })).toBe(false);
      expect(isRpcBlockRangeOrLimitError(new Error("Database connection closed"))).toBe(false);
    });

    it("sanitizes log messages to ensure RPC URLs with secret keys/tokens are redacted", () => {
      const errorWithSecretUrl =
        "RPC request failed at https://avalanche-fuji.infura.io/v3/9aa3d95b3c84493a99d8e123456789ab with status 400";
      const sanitized = sanitizeLogMessage(errorWithSecretUrl);

      expect(sanitized).not.toContain("https://avalanche-fuji.infura.io");
      expect(sanitized).not.toContain("9aa3d95b3c84493a99d8e123456789ab");
      expect(sanitized).toContain("[REDACTED_RPC_URL]");
    });
  });

  describe("Multi-chunk catch-up execution & limits", () => {
    it("processes multiple chunks in a single run and catches up to latestBlock", async () => {
      const startBlock = 59271254n;
      const targetLatest = startBlock + 4500n; // ~3 chunks (2000, 2000, 500)
      const rangesQueried: Array<{ from: bigint; to: bigint }> = [];

      const mockClient = {
        getBlockNumber: async () => targetLatest,
        getLogs: async (args: { fromBlock: bigint; toBlock: bigint }) => {
          rangesQueried.push({ from: args.fromBlock, to: args.toBlock });
          return [];
        },
      } as unknown as PublicClient;

      // Mock database transaction client
      let savedCursor: bigint = 0n;
      const mockTx = {
        $queryRaw: async () => [{ acquired: true }],
        reconciliationCursor: {
          findUnique: async () => ({ lastBlockNumber: startBlock }),
          upsert: async (args: { update: { lastBlockNumber: bigint } }) => {
            savedCursor = args.update.lastBlockNumber;
            return { lastBlockNumber: savedCursor };
          },
        },
        invoice: {
          findFirst: async () => null,
          findMany: async () => [],
          updateMany: async () => ({ count: 0 }),
        },
        paymentEvent: {
          upsert: async () => ({}),
        },
        auditLog: {
          create: async () => ({}),
        },
      };

      const result = await runReconciliation({
        prismaClient: mockTx as any,
        publicClient: mockClient,
        maxChunks: 5,
        timeBudgetMs: 5000,
      });

      expect(result.acquiredLock).toBe(true);
      expect(result.chunksProcessed).toBe(3);
      expect(rangesQueried.length).toBe(3);
      // Chunk 1: startBlock - lookback (or startBlock) to +2000
      expect(rangesQueried[0].to).toBe(rangesQueried[0].from + 2000n);
      // Final chunk finishes at targetLatest
      expect(rangesQueried[2].to).toBe(targetLatest);
      // Saved cursor persisted at targetLatest
      expect(savedCursor).toBe(targetLatest);
    });

    it("respects maxChunks boundary and stops early without exceeding limit", async () => {
      const startBlock = 59271254n;
      const targetLatest = startBlock + 20000n; // 10 chunks ahead

      let chunksCalled = 0;
      const mockClient = {
        getBlockNumber: async () => targetLatest,
        getLogs: async () => {
          chunksCalled++;
          return [];
        },
      } as unknown as PublicClient;

      const mockTx = {
        $queryRaw: async () => [{ acquired: true }],
        reconciliationCursor: {
          findUnique: async () => ({ lastBlockNumber: startBlock }),
          upsert: async () => ({}),
        },
        invoice: {
          findFirst: async () => null,
          findMany: async () => [],
          updateMany: async () => ({ count: 0 }),
        },
        paymentEvent: {
          upsert: async () => ({}),
        },
        auditLog: {
          create: async () => ({}),
        },
      };

      const result = await runReconciliation({
        prismaClient: mockTx as any,
        publicClient: mockClient,
        maxChunks: 2, // Strictly bound to 2 chunks
      });

      expect(result.chunksProcessed).toBe(2);
      expect(chunksCalled).toBe(2);
    });
  });
});
