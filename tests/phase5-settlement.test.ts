import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getTestPrisma } from "@/lib/db/test-db";
import { recomputeInvoiceSettlement } from "@/lib/settlement/settlement-engine";
import crypto from "crypto";
import type { PrismaClient } from "@prisma/client";
import { InvoiceStatus } from "@prisma/client";
import type { PublicClient } from "viem";

describe("Phase 5 - Settlement Engine & Reorg Fixtures", () => {
  let testPrisma: PrismaClient;
  const routerAddress = "0xb94a922261bba2e07648520bf56125a4102eab95";
  const chainId = 43113;

  beforeAll(async () => {
    testPrisma = getTestPrisma();
    await testPrisma.$connect();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  async function createFixtureInvoice(params?: {
    amountUsdc?: bigint;
    status?: InvoiceStatus;
    dueDate?: Date;
  }) {
    const walletAddress = ("0x" + crypto.randomBytes(20).toString("hex")).toLowerCase();
    const merchant = await testPrisma.merchant.create({
      data: {
        walletAddress,
        displayName: "Settlement Test Merchant",
      },
    });

    const publicId = `raseed_settle_${crypto.randomBytes(18).toString("base64url")}`;
    const onchainInvoiceId = ("0x" + crypto.randomBytes(32).toString("hex")).toLowerCase();

    const invoice = await testPrisma.invoice.create({
      data: {
        publicId,
        merchantId: merchant.id,
        invoiceNumber: "INV-SETTLE-001",
        title: "Settlement Test Invoice",
        dueDate: params?.dueDate ?? new Date(Date.now() + 86400000),
        amountUsdc: params?.amountUsdc ?? 10_000_000n, // 10 USDC
        status: params?.status ?? InvoiceStatus.SENT,
        onchainInvoiceId,
      },
    });

    return { invoice, merchant };
  }

  async function createFixturePaymentEvent(params: {
    invoiceId: string;
    amountUsdc: bigint;
    blockNumber: bigint;
    blockHash: string;
    onchainInvoiceId: string;
    merchantAddress: string;
    logIndex?: number;
    txHash?: string;
  }) {
    const txHash = params.txHash ?? ("0x" + crypto.randomBytes(32).toString("hex")).toLowerCase();
    const payerAddress = ("0x" + crypto.randomBytes(20).toString("hex")).toLowerCase();

    return await testPrisma.paymentEvent.create({
      data: {
        invoiceId: params.invoiceId,
        txHash,
        logIndex: params.logIndex ?? 0,
        blockHash: params.blockHash.toLowerCase(),
        blockNumber: params.blockNumber,
        chainId,
        routerAddress,
        merchantAddress: params.merchantAddress.toLowerCase(),
        payerAddress,
        onchainInvoiceId: params.onchainInvoiceId.toLowerCase(),
        amountUsdc: params.amountUsdc,
        feeUsdc: 0n,
      },
    });
  }

  it("advances status to PARTIALLY_PAID when payment is between dust and total amount", async () => {
    const { invoice, merchant } = await createFixtureInvoice({ amountUsdc: 10_000_000n });
    const blockHash = ("0x" + crypto.randomBytes(32).toString("hex")).toLowerCase();

    // Add a partial payment: 4 USDC (4,000,000 micro-USDC)
    await createFixturePaymentEvent({
      invoiceId: invoice.id,
      amountUsdc: 4_000_000n,
      blockNumber: 100n,
      blockHash,
      onchainInvoiceId: invoice.onchainInvoiceId,
      merchantAddress: merchant.walletAddress,
    });

    const mockClient = {
      getBlockNumber: async () => 110n, // 11 confirmations
      getBlock: async () => ({ hash: blockHash }),
    } as unknown as PublicClient;

    const result = await recomputeInvoiceSettlement(invoice.id, {
      publicClient: mockClient,
      prismaClient: testPrisma,
    });

    expect(result.newStatus).toBe(InvoiceStatus.PARTIALLY_PAID);
    expect(result.paidAmountUsdc).toBe(4_000_000n);

    // Clean up
    await testPrisma.paymentEvent.deleteMany({ where: { invoiceId: invoice.id } });
    await testPrisma.invoice.delete({ where: { id: invoice.id } });
    await testPrisma.merchant.delete({ where: { id: merchant.id } });
  }, 25000);

  it("advances status to PAID when multiple partial payments sum to total amount", async () => {
    const { invoice, merchant } = await createFixtureInvoice({ amountUsdc: 10_000_000n });
    const blockHash1 = ("0x" + crypto.randomBytes(32).toString("hex")).toLowerCase();
    const blockHash2 = ("0x" + crypto.randomBytes(32).toString("hex")).toLowerCase();

    // Partial 1: 6 USDC
    await createFixturePaymentEvent({
      invoiceId: invoice.id,
      amountUsdc: 6_000_000n,
      blockNumber: 100n,
      blockHash: blockHash1,
      onchainInvoiceId: invoice.onchainInvoiceId,
      merchantAddress: merchant.walletAddress,
    });

    // Partial 2: 4 USDC
    await createFixturePaymentEvent({
      invoiceId: invoice.id,
      amountUsdc: 4_000_000n,
      blockNumber: 105n,
      blockHash: blockHash2,
      onchainInvoiceId: invoice.onchainInvoiceId,
      merchantAddress: merchant.walletAddress,
    });

    const mockClient = {
      getBlockNumber: async () => 120n,
      getBlock: async ({ blockNumber }: { blockNumber: bigint }) => {
        if (blockNumber === 100n) return { hash: blockHash1 };
        return { hash: blockHash2 };
      },
    } as unknown as PublicClient;

    const result = await recomputeInvoiceSettlement(invoice.id, {
      publicClient: mockClient,
      prismaClient: testPrisma,
    });

    // 6 USDC + 4 USDC = 10 USDC => PAID!
    expect(result.newStatus).toBe(InvoiceStatus.PAID);
    expect(result.paidAmountUsdc).toBe(10_000_000n);
    expect(result.validEventsCount).toBe(2);

    // Clean up
    await testPrisma.paymentEvent.deleteMany({ where: { invoiceId: invoice.id } });
    await testPrisma.invoice.delete({ where: { id: invoice.id } });
    await testPrisma.merchant.delete({ where: { id: merchant.id } });
  }, 25000);

  it("advances status to PAID and flags OVERPAYMENT_RECEIVED when payment exceeds amount", async () => {
    const { invoice, merchant } = await createFixtureInvoice({ amountUsdc: 10_000_000n });
    const blockHash = ("0x" + crypto.randomBytes(32).toString("hex")).toLowerCase();

    // Overpayment: 15 USDC (15,000,000 micro-USDC)
    await createFixturePaymentEvent({
      invoiceId: invoice.id,
      amountUsdc: 15_000_000n,
      blockNumber: 200n,
      blockHash,
      onchainInvoiceId: invoice.onchainInvoiceId,
      merchantAddress: merchant.walletAddress,
    });

    const mockClient = {
      getBlockNumber: async () => 210n,
      getBlock: async () => ({ hash: blockHash }),
    } as unknown as PublicClient;

    const result = await recomputeInvoiceSettlement(invoice.id, {
      publicClient: mockClient,
      prismaClient: testPrisma,
    });

    expect(result.newStatus).toBe(InvoiceStatus.PAID);
    expect(result.isOverpaid).toBe(true);
    expect(result.warnings).toContain("OVERPAYMENT_RECEIVED");

    // Clean up
    await testPrisma.paymentEvent.deleteMany({ where: { invoiceId: invoice.id } });
    await testPrisma.auditLog.deleteMany({ where: { invoiceId: invoice.id } });
    await testPrisma.invoice.delete({ where: { id: invoice.id } });
    await testPrisma.merchant.delete({ where: { id: merchant.id } });
  }, 25000);

  it("stores dust payments (< 0.01 USDC / 10000 micro) in DB but NEVER changes status on its own", async () => {
    const { invoice, merchant } = await createFixtureInvoice({
      amountUsdc: 10_000_000n,
      status: InvoiceStatus.SENT,
    });
    const blockHash = ("0x" + crypto.randomBytes(32).toString("hex")).toLowerCase();

    // Dust payment: 0.005 USDC (5,000 micro-units < 10,000 threshold)
    await createFixturePaymentEvent({
      invoiceId: invoice.id,
      amountUsdc: 5_000n,
      blockNumber: 300n,
      blockHash,
      onchainInvoiceId: invoice.onchainInvoiceId,
      merchantAddress: merchant.walletAddress,
    });

    const mockClient = {
      getBlockNumber: async () => 310n,
      getBlock: async () => ({ hash: blockHash }),
    } as unknown as PublicClient;

    const result = await recomputeInvoiceSettlement(invoice.id, {
      publicClient: mockClient,
      prismaClient: testPrisma,
    });

    // Dust is stored in database and reflects in ledger sum
    expect(result.hasDust).toBe(true);
    expect(result.paidAmountUsdc).toBe(5_000n);
    // But status NEVER changes on its own (remains SENT)
    expect(result.newStatus).toBe(InvoiceStatus.SENT);

    // Clean up
    await testPrisma.paymentEvent.deleteMany({ where: { invoiceId: invoice.id } });
    await testPrisma.invoice.delete({ where: { id: invoice.id } });
    await testPrisma.merchant.delete({ where: { id: merchant.id } });
  }, 25000);

  it("preserves CANCELLED status on payment and records PAYMENT_ON_CANCELLED_INVOICE flag", async () => {
    const { invoice, merchant } = await createFixtureInvoice({
      amountUsdc: 5_000_000n,
      status: InvoiceStatus.CANCELLED,
    });
    const blockHash = ("0x" + crypto.randomBytes(32).toString("hex")).toLowerCase();

    // Settle 5 USDC to cancelled invoice
    await createFixturePaymentEvent({
      invoiceId: invoice.id,
      amountUsdc: 5_000_000n,
      blockNumber: 400n,
      blockHash,
      onchainInvoiceId: invoice.onchainInvoiceId,
      merchantAddress: merchant.walletAddress,
    });

    const mockClient = {
      getBlockNumber: async () => 410n,
      getBlock: async () => ({ hash: blockHash }),
    } as unknown as PublicClient;

    const result = await recomputeInvoiceSettlement(invoice.id, {
      publicClient: mockClient,
      prismaClient: testPrisma,
    });

    // Status MUST remain CANCELLED
    expect(result.newStatus).toBe(InvoiceStatus.CANCELLED);
    expect(result.warnings).toContain("PAYMENT_ON_CANCELLED_INVOICE");

    // Clean up
    await testPrisma.paymentEvent.deleteMany({ where: { invoiceId: invoice.id } });
    await testPrisma.auditLog.deleteMany({ where: { invoiceId: invoice.id } });
    await testPrisma.invoice.delete({ where: { id: invoice.id } });
    await testPrisma.merchant.delete({ where: { id: merchant.id } });
  }, 25000);

  it("soft-invalidates reorged events when blockHash differs and excludes them from sums; re-validates if canonical again", async () => {
    const { invoice, merchant } = await createFixtureInvoice({ amountUsdc: 5_000_000n });
    const oldBlockHash = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const canonicalBlockHash = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

    // 1. Insert payment with orphaned block hash
    const orphanEvent = await createFixturePaymentEvent({
      invoiceId: invoice.id,
      amountUsdc: 5_000_000n,
      blockNumber: 500n,
      blockHash: oldBlockHash,
      onchainInvoiceId: invoice.onchainInvoiceId,
      merchantAddress: merchant.walletAddress,
    });

    // 2. Mock client returns a DIFFERENT hash for block 500 (orphaned reorg branch)
    const mockClientReorg = {
      getBlockNumber: async () => 510n,
      getBlock: async () => ({ hash: canonicalBlockHash }),
    } as unknown as PublicClient;

    const resultReorg = await recomputeInvoiceSettlement(invoice.id, {
      publicClient: mockClientReorg,
      prismaClient: testPrisma,
    });

    // Orphaned event must NOT be deleted, but SOFT-INVALIDATED in DB
    expect(resultReorg.invalidatedReorgCount).toBe(1);
    expect(resultReorg.paidAmountUsdc).toBe(0n);
    expect(resultReorg.newStatus).toBe(InvoiceStatus.SENT);

    const checkEvent = await testPrisma.paymentEvent.findUnique({
      where: { id: orphanEvent.id },
    });
    expect(checkEvent).not.toBeNull();
    expect(checkEvent?.invalidatedAt).toBeInstanceOf(Date);
    expect(checkEvent?.invalidReason).toMatch(/Canonical block hash mismatch/);

    // Verify AuditLog record
    const auditLogs = await testPrisma.auditLog.findMany({
      where: { invoiceId: invoice.id, action: "REORG_EVENT_INVALIDATED" },
    });
    expect(auditLogs.length).toBeGreaterThan(0);

    // 3. Now test RE-VALIDATION: blockchain switches back to canonical hash matching the event
    const mockClientCanonical = {
      getBlockNumber: async () => 515n,
      getBlock: async () => ({ hash: oldBlockHash }),
    } as unknown as PublicClient;

    const resultRevalidated = await recomputeInvoiceSettlement(invoice.id, {
      publicClient: mockClientCanonical,
      prismaClient: testPrisma,
    });

    // Re-validation succeeds!
    expect(resultRevalidated.paidAmountUsdc).toBe(5_000_000n);
    expect(resultRevalidated.newStatus).toBe(InvoiceStatus.PAID);

    const revalidatedEvent = await testPrisma.paymentEvent.findUnique({
      where: { id: orphanEvent.id },
    });
    expect(revalidatedEvent?.invalidatedAt).toBeNull();
    expect(revalidatedEvent?.invalidReason).toBeNull();

    // Verify AuditLog record for re-validation
    const revalLogs = await testPrisma.auditLog.findMany({
      where: { invoiceId: invoice.id, action: "REORG_EVENT_REVALIDATED" },
    });
    expect(revalLogs.length).toBeGreaterThan(0);

    // Clean up
    await testPrisma.paymentEvent.deleteMany({ where: { invoiceId: invoice.id } });
    await testPrisma.auditLog.deleteMany({ where: { invoiceId: invoice.id } });
    await testPrisma.invoice.delete({ where: { id: invoice.id } });
    await testPrisma.merchant.delete({ where: { id: merchant.id } });
  }, 25000);

  it("fetches chain data before opening DB transaction and proves no lock is held during slow RPC", async () => {
    const { invoice, merchant } = await createFixtureInvoice({ amountUsdc: 5_000_000n });
    const blockHash = ("0x" + crypto.randomBytes(32).toString("hex")).toLowerCase();

    await createFixturePaymentEvent({
      invoiceId: invoice.id,
      amountUsdc: 5_000_000n,
      blockNumber: 700n,
      blockHash,
      onchainInvoiceId: invoice.onchainInvoiceId,
      merchantAddress: merchant.walletAddress,
    });

    // Mock an RPC client with a 3-second delay
    const slowClient = {
      getBlockNumber: async () => {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        return 710n;
      },
      getBlock: async () => {
        return { hash: blockHash };
      },
    } as unknown as PublicClient;

    // During the slow RPC call, another client should easily read and update without database lock timeout
    const startTime = Date.now();
    const settlementPromise = recomputeInvoiceSettlement(invoice.id, {
      publicClient: slowClient,
      prismaClient: testPrisma,
    });

    // Concurrently read invoice from another client while RPC is executing
    await new Promise((resolve) => setTimeout(resolve, 500));
    const concurrentRead = await testPrisma.invoice.findUnique({ where: { id: invoice.id } });
    expect(concurrentRead).not.toBeNull();

    const result = await settlementPromise;
    const elapsed = Date.now() - startTime;

    expect(elapsed).toBeGreaterThanOrEqual(3000);
    expect(result.newStatus).toBe(InvoiceStatus.PAID);
    expect(result.paidAmountUsdc).toBe(5_000_000n);

    // Clean up
    await testPrisma.paymentEvent.deleteMany({ where: { invoiceId: invoice.id } });
    await testPrisma.invoice.delete({ where: { id: invoice.id } });
    await testPrisma.merchant.delete({ where: { id: merchant.id } });
  }, 25000);

  it("enforces confirmations requirement (pending events are not counted until N confirmations)", async () => {
    const { invoice, merchant } = await createFixtureInvoice({ amountUsdc: 5_000_000n });
    const blockHash = ("0x" + crypto.randomBytes(32).toString("hex")).toLowerCase();

    // Event mined at block 600
    await createFixturePaymentEvent({
      invoiceId: invoice.id,
      amountUsdc: 5_000_000n,
      blockNumber: 600n,
      blockHash,
      onchainInvoiceId: invoice.onchainInvoiceId,
      merchantAddress: merchant.walletAddress,
    });

    // Current block is 601 -> only 2 confirmations (601 - 600 + 1 = 2) < default 3
    const mockClient = {
      getBlockNumber: async () => 601n,
      getBlock: async () => ({ hash: blockHash }),
    } as unknown as PublicClient;

    const result = await recomputeInvoiceSettlement(invoice.id, {
      publicClient: mockClient,
      confirmations: 3,
      prismaClient: testPrisma,
    });

    // Must still have 0 valid confirmed payments!
    expect(result.validEventsCount).toBe(0);
    expect(result.paidAmountUsdc).toBe(0n);
    expect(result.newStatus).toBe(InvoiceStatus.SENT);

    // Clean up
    await testPrisma.paymentEvent.deleteMany({ where: { invoiceId: invoice.id } });
    await testPrisma.invoice.delete({ where: { id: invoice.id } });
    await testPrisma.merchant.delete({ where: { id: merchant.id } });
  }, 25000);
});
