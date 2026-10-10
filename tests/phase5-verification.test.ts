import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getTestPrisma } from "@/lib/db/test-db";
import { verifyAndRecordPayment, PAID_EVENT_ABI } from "@/lib/settlement/verification";
import { encodeEventTopics, encodeAbiParameters, parseAbiParameters, type PublicClient } from "viem";
import crypto from "crypto";
import type { PrismaClient } from "@prisma/client";

describe("Phase 5 - Server Verification Fixtures", () => {
  let testPrisma: PrismaClient;
  const configuredRouter = "0xb94a922261bba2e07648520bf56125a4102eab95";
  const chainId = 43113;

  beforeAll(async () => {
    testPrisma = getTestPrisma();
    await testPrisma.$connect();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  // Helper to create a test invoice
  async function createTestInvoice(amountUsdc: bigint = 10_000_000n) {
    const walletAddress = ("0x" + crypto.randomBytes(20).toString("hex")).toLowerCase();
    const merchant = await testPrisma.merchant.create({
      data: {
        walletAddress,
        displayName: "Verification Test Merchant",
      },
    });

    const publicId = `raseed_test_${crypto.randomBytes(18).toString("base64url")}`;
    const onchainInvoiceId = ("0x" + crypto.randomBytes(32).toString("hex")).toLowerCase();

    const invoice = await testPrisma.invoice.create({
      data: {
        publicId,
        merchantId: merchant.id,
        invoiceNumber: "INV-VERIFY-001",
        title: "Test Verification Invoice",
        dueDate: new Date(Date.now() + 86400000),
        amountUsdc,
        onchainInvoiceId,
      },
      include: { merchant: true },
    });

    return { invoice, merchant };
  }

  // Helper to build a simulated Paid event log
  function buildPaidLog(params: {
    routerAddress?: string;
    invoiceId: `0x${string}`;
    payer: `0x${string}`;
    merchant: `0x${string}`;
    amount: bigint;
    fee?: bigint;
    logIndex?: number;
  }) {
    const fee = params.fee ?? 0n;
    const routerAddress = (params.routerAddress || configuredRouter).toLowerCase() as `0x${string}`;

    const topics = encodeEventTopics({
      abi: [PAID_EVENT_ABI],
      eventName: "Paid",
      args: {
        invoiceId: params.invoiceId,
        payer: params.payer,
        merchant: params.merchant,
      },
    });

    const data = encodeAbiParameters(
      parseAbiParameters("uint256 amount, uint256 fee"),
      [params.amount, fee]
    );

    return {
      address: routerAddress,
      topics,
      data,
      logIndex: params.logIndex ?? 0,
    };
  }

  it(
    "verifies and records valid payment from configured router",
    async () => {
      const { invoice, merchant } = await createTestInvoice(5_000_000n);
      const txHash = ("0x" + crypto.randomBytes(32).toString("hex")).toLowerCase() as `0x${string}`;
      const payer = ("0x" + crypto.randomBytes(20).toString("hex")).toLowerCase() as `0x${string}`;
      const blockHash = ("0x" + crypto.randomBytes(32).toString("hex")).toLowerCase();
      const blockNumber = 1000n;

      const log = buildPaidLog({
        invoiceId: invoice.onchainInvoiceId as `0x${string}`,
        payer,
        merchant: merchant.walletAddress as `0x${string}`,
        amount: 5_000_000n,
      });

      const mockClient = {
        getTransactionReceipt: async () => ({
          status: "success",
          transactionHash: txHash,
          blockHash,
          blockNumber,
          logs: [log],
        }),
        getBlockNumber: async () => 1010n,
        getBlock: async () => ({ hash: blockHash }),
      } as unknown as PublicClient;

      const result = await verifyAndRecordPayment({
        publicId: invoice.publicId,
        txHash,
        expectedRouterAddress: configuredRouter,
        publicClient: mockClient,
        prismaClient: testPrisma,
      });

      expect(result.success).toBe(true);
      expect(result.settlement?.newStatus).toBe("PAID");
      expect(result.settlement?.paidAmountUsdc).toBe(5_000_000n);

      // Verify stored event in DB
      const event = await testPrisma.paymentEvent.findUnique({
        where: {
          chainId_txHash_logIndex: {
            chainId,
            txHash,
            logIndex: 0,
          },
        },
      });
      expect(event).toBeDefined();
      expect(event?.amountUsdc).toBe(5_000_000n);
      expect(event?.payerAddress).toBe(payer);
      expect(event?.routerAddress).toBe(configuredRouter);

      // Clean up
      await testPrisma.paymentEvent.deleteMany({ where: { invoiceId: invoice.id } });
      await testPrisma.invoice.delete({ where: { id: invoice.id } });
      await testPrisma.merchant.delete({ where: { id: merchant.id } });
    },
    25000
  );

  it(
    "rejects when transaction status is reverted/failed",
    async () => {
      const { invoice, merchant } = await createTestInvoice();
      const txHash = ("0x" + crypto.randomBytes(32).toString("hex")).toLowerCase() as `0x${string}`;

      const mockClient = {
        getTransactionReceipt: async () => ({
          status: "reverted",
          transactionHash: txHash,
          blockHash: "0xabc",
          blockNumber: 1000n,
          logs: [],
        }),
      } as unknown as PublicClient;

      const result = await verifyAndRecordPayment({
        publicId: invoice.publicId,
        txHash,
        expectedRouterAddress: configuredRouter,
        publicClient: mockClient,
        prismaClient: testPrisma,
      });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toMatch(/Transaction reverted/);

      // Clean up
      await testPrisma.invoice.delete({ where: { id: invoice.id } });
      await testPrisma.merchant.delete({ where: { id: merchant.id } });
    },
    25000
  );

  it(
    "ignores fake Paid log from another contract (wrong router address)",
    async () => {
      const { invoice, merchant } = await createTestInvoice();
      const txHash = ("0x" + crypto.randomBytes(32).toString("hex")).toLowerCase() as `0x${string}`;
      const rogueContract = "0x1111111111111111111111111111111111111111";

      const fakeLog = buildPaidLog({
        routerAddress: rogueContract, // Rogue attacker contract
        invoiceId: invoice.onchainInvoiceId as `0x${string}`,
        payer: "0x2222222222222222222222222222222222222222",
        merchant: merchant.walletAddress as `0x${string}`,
        amount: 10_000_000n,
      });

      const mockClient = {
        getTransactionReceipt: async () => ({
          status: "success",
          transactionHash: txHash,
          blockHash: "0xabc",
          blockNumber: 1000n,
          logs: [fakeLog],
        }),
      } as unknown as PublicClient;

      const result = await verifyAndRecordPayment({
        publicId: invoice.publicId,
        txHash,
        expectedRouterAddress: configuredRouter,
        publicClient: mockClient,
        prismaClient: testPrisma,
      });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toMatch(/No matching Paid event log found/);

      // Clean up
      await testPrisma.invoice.delete({ where: { id: invoice.id } });
      await testPrisma.merchant.delete({ where: { id: merchant.id } });
    },
    25000
  );

  it(
    "rejects log with wrong merchant address",
    async () => {
      const { invoice, merchant } = await createTestInvoice();
      const txHash = ("0x" + crypto.randomBytes(32).toString("hex")).toLowerCase() as `0x${string}`;
      const wrongMerchant = "0x9999999999999999999999999999999999999999";

      const log = buildPaidLog({
        invoiceId: invoice.onchainInvoiceId as `0x${string}`,
        payer: "0x2222222222222222222222222222222222222222",
        merchant: wrongMerchant,
        amount: 10_000_000n,
      });

      const mockClient = {
        getTransactionReceipt: async () => ({
          status: "success",
          transactionHash: txHash,
          blockHash: "0xabc",
          blockNumber: 1000n,
          logs: [log],
        }),
      } as unknown as PublicClient;

      const result = await verifyAndRecordPayment({
        publicId: invoice.publicId,
        txHash,
        expectedRouterAddress: configuredRouter,
        publicClient: mockClient,
        prismaClient: testPrisma,
      });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);

      // Clean up
      await testPrisma.invoice.delete({ where: { id: invoice.id } });
      await testPrisma.merchant.delete({ where: { id: merchant.id } });
    },
    25000
  );

  it(
    "rejects log with wrong invoiceId",
    async () => {
      const { invoice, merchant } = await createTestInvoice();
      const txHash = ("0x" + crypto.randomBytes(32).toString("hex")).toLowerCase() as `0x${string}`;
      const wrongInvoiceId = ("0x" + crypto.randomBytes(32).toString("hex")).toLowerCase() as `0x${string}`;

      const log = buildPaidLog({
        invoiceId: wrongInvoiceId,
        payer: "0x2222222222222222222222222222222222222222",
        merchant: merchant.walletAddress as `0x${string}`,
        amount: 10_000_000n,
      });

      const mockClient = {
        getTransactionReceipt: async () => ({
          status: "success",
          transactionHash: txHash,
          blockHash: "0xabc",
          blockNumber: 1000n,
          logs: [log],
        }),
      } as unknown as PublicClient;

      const result = await verifyAndRecordPayment({
        publicId: invoice.publicId,
        txHash,
        expectedRouterAddress: configuredRouter,
        publicClient: mockClient,
        prismaClient: testPrisma,
      });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);

      // Clean up
      await testPrisma.invoice.delete({ where: { id: invoice.id } });
      await testPrisma.merchant.delete({ where: { id: merchant.id } });
    },
    25000
  );

  it(
    "duplicate report is idempotent and never double-counts",
    async () => {
      const { invoice, merchant } = await createTestInvoice(10_000_000n);
      const txHash = ("0x" + crypto.randomBytes(32).toString("hex")).toLowerCase() as `0x${string}`;
      const payer = ("0x" + crypto.randomBytes(20).toString("hex")).toLowerCase() as `0x${string}`;
      const blockHash = ("0x" + crypto.randomBytes(32).toString("hex")).toLowerCase();
      const blockNumber = 1500n;

      const log = buildPaidLog({
        invoiceId: invoice.onchainInvoiceId as `0x${string}`,
        payer,
        merchant: merchant.walletAddress as `0x${string}`,
        amount: 4_000_000n,
      });

      const mockClient = {
        getTransactionReceipt: async () => ({
          status: "success",
          transactionHash: txHash,
          blockHash,
          blockNumber,
          logs: [log],
        }),
        getBlockNumber: async () => 1510n,
        getBlock: async () => ({ hash: blockHash }),
      } as unknown as PublicClient;

      // Report #1
      const res1 = await verifyAndRecordPayment({
        publicId: invoice.publicId,
        txHash,
        expectedRouterAddress: configuredRouter,
        publicClient: mockClient,
        prismaClient: testPrisma,
      });
      expect(res1.success).toBe(true);
      expect(res1.settlement?.paidAmountUsdc).toBe(4_000_000n);

      // Report #2 (exact same txHash)
      const res2 = await verifyAndRecordPayment({
        publicId: invoice.publicId,
        txHash,
        expectedRouterAddress: configuredRouter,
        publicClient: mockClient,
        prismaClient: testPrisma,
      });
      expect(res2.success).toBe(true);
      // Amount must still be 4_000_000n, NEVER 8_000_000n!
      expect(res2.settlement?.paidAmountUsdc).toBe(4_000_000n);

      // Check count of events in DB
      const count = await testPrisma.paymentEvent.count({
        where: { invoiceId: invoice.id },
      });
      expect(count).toBe(1);

      // Clean up
      await testPrisma.paymentEvent.deleteMany({ where: { invoiceId: invoice.id } });
      await testPrisma.invoice.delete({ where: { id: invoice.id } });
      await testPrisma.merchant.delete({ where: { id: merchant.id } });
    },
    25000
  );

  it(
    "handles RPC errors gracefully without marking anything failed",
    async () => {
      const { invoice, merchant } = await createTestInvoice();
      const txHash = ("0x" + crypto.randomBytes(32).toString("hex")).toLowerCase() as `0x${string}`;

      const mockFailingClient = {
        getTransactionReceipt: async () => {
          throw new Error("RPC Rate Limit Exceeded or Connection Timeout");
        },
      } as unknown as PublicClient;

      const result = await verifyAndRecordPayment({
        publicId: invoice.publicId,
        txHash,
        expectedRouterAddress: configuredRouter,
        publicClient: mockFailingClient,
        prismaClient: testPrisma,
      });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(503);
      expect(result.error).toMatch(/RPC communication error/);

      // Invoice status in DB remains intact (DRAFT), NOT failed or cancelled
      const inv = await testPrisma.invoice.findUnique({ where: { id: invoice.id } });
      expect(inv?.status).toBe("DRAFT");

      // Clean up
      await testPrisma.invoice.delete({ where: { id: invoice.id } });
      await testPrisma.merchant.delete({ where: { id: merchant.id } });
    },
    25000
  );

  it(
    "two matching Paid logs in one tx are both processed and recorded",
    async () => {
      const { invoice, merchant } = await createTestInvoice(10_000_000n);
      const txHash = ("0x" + crypto.randomBytes(32).toString("hex")).toLowerCase() as `0x${string}`;
      const payer = ("0x" + crypto.randomBytes(20).toString("hex")).toLowerCase() as `0x${string}`;
      const blockHash = ("0x" + crypto.randomBytes(32).toString("hex")).toLowerCase();
      const blockNumber = 1600n;

      // Two distinct logs in the same receipt (e.g. batch or dual payment call)
      const log1 = buildPaidLog({
        invoiceId: invoice.onchainInvoiceId as `0x${string}`,
        payer,
        merchant: merchant.walletAddress as `0x${string}`,
        amount: 3_000_000n,
        logIndex: 0,
      });

      const log2 = buildPaidLog({
        invoiceId: invoice.onchainInvoiceId as `0x${string}`,
        payer,
        merchant: merchant.walletAddress as `0x${string}`,
        amount: 7_000_000n,
        logIndex: 1,
      });

      const mockClient = {
        getTransactionReceipt: async () => ({
          status: "success",
          transactionHash: txHash,
          blockHash,
          blockNumber,
          logs: [log1, log2],
        }),
        getBlockNumber: async () => 1610n,
        getBlock: async () => ({ hash: blockHash }),
      } as unknown as PublicClient;

      const result = await verifyAndRecordPayment({
        publicId: invoice.publicId,
        txHash,
        expectedRouterAddress: configuredRouter,
        publicClient: mockClient,
        prismaClient: testPrisma,
      });

      expect(result.success).toBe(true);
      // Both logs processed: 3 + 7 = 10 USDC => PAID!
      expect(result.settlement?.paidAmountUsdc).toBe(10_000_000n);
      expect(result.settlement?.newStatus).toBe("PAID");

      const events = await testPrisma.paymentEvent.findMany({
        where: { invoiceId: invoice.id },
      });
      expect(events.length).toBe(2);

      // Clean up
      await testPrisma.paymentEvent.deleteMany({ where: { invoiceId: invoice.id } });
      await testPrisma.invoice.delete({ where: { id: invoice.id } });
      await testPrisma.merchant.delete({ where: { id: merchant.id } });
    },
    25000
  );

  it(
    "client-supplied amount is completely ignored; onchain event amount is strictly used",
    async () => {
      const { invoice, merchant } = await createTestInvoice(10_000_000n);
      const txHash = ("0x" + crypto.randomBytes(32).toString("hex")).toLowerCase() as `0x${string}`;
      const payer = ("0x" + crypto.randomBytes(20).toString("hex")).toLowerCase() as `0x${string}`;
      const blockHash = ("0x" + crypto.randomBytes(32).toString("hex")).toLowerCase();
      const blockNumber = 1700n;

      // On-chain event is for 2 USDC (2,000,000 micro-USDC)
      const onchainLog = buildPaidLog({
        invoiceId: invoice.onchainInvoiceId as `0x${string}`,
        payer,
        merchant: merchant.walletAddress as `0x${string}`,
        amount: 2_000_000n,
        logIndex: 0,
      });

      const mockClient = {
        getTransactionReceipt: async () => ({
          status: "success",
          transactionHash: txHash,
          blockHash,
          blockNumber,
          logs: [onchainLog],
        }),
        getBlockNumber: async () => 1710n,
        getBlock: async () => ({ hash: blockHash }),
      } as unknown as PublicClient;

      // Regardless of what client might claim, the server takes ONLY publicId and txHash
      const result = await verifyAndRecordPayment({
        publicId: invoice.publicId,
        txHash,
        expectedRouterAddress: configuredRouter,
        publicClient: mockClient,
        prismaClient: testPrisma,
      });

      expect(result.success).toBe(true);
      // Paid amount in DB must strictly equal 2 USDC (from the onchain log), NOT the full invoice amount
      expect(result.settlement?.paidAmountUsdc).toBe(2_000_000n);
      expect(result.settlement?.newStatus).toBe("PARTIALLY_PAID");

      // Clean up
      await testPrisma.paymentEvent.deleteMany({ where: { invoiceId: invoice.id } });
      await testPrisma.invoice.delete({ where: { id: invoice.id } });
      await testPrisma.merchant.delete({ where: { id: merchant.id } });
    },
    25000
  );
});
