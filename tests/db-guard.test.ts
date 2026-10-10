import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import crypto from "crypto";

describe("Database Guard & Concurrency Constraints", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("fails fast if USE_IN_MEMORY_DB is enabled in production mode", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalMemoryFlag = process.env.USE_IN_MEMORY_DB;

    try {
      process.env.NODE_ENV = "production";
      process.env.USE_IN_MEMORY_DB = "true";

      expect(() => {
        if (process.env.NODE_ENV === "production" && process.env.USE_IN_MEMORY_DB === "true") {
          throw new Error(
            "SECURITY CONFIGURATION ERROR: In-memory database store is strictly prohibited in production."
          );
        }
      }).toThrow(/In-memory database store is strictly prohibited in production/);
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      process.env.USE_IN_MEMORY_DB = originalMemoryFlag;
    }
  });

  it(
    "enforces database unique constraint on PaymentEvent (chainId, txHash, logIndex)",
    async () => {
      const testWallet = "0x" + crypto.randomBytes(20).toString("hex");
      const chainId = 43113;
      const txHash = "0x" + crypto.randomBytes(32).toString("hex");
      const logIndex = 0;

      // 1. Create a merchant & invoice
      const merchant = await prisma.merchant.upsert({
        where: { walletAddress: testWallet },
        update: {},
        create: {
          walletAddress: testWallet,
          displayName: "Constraint Test Merchant",
        },
      });

      const invoice = await prisma.invoice.create({
        data: {
          publicId: `test_pub_unique_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
          merchantId: merchant.id,
          invoiceNumber: `INV-CONCUR-${Date.now()}`,
          title: "Constraint Test Invoice",
          dueDate: new Date(Date.now() + 86400000),
          amountUsdc: 1_000_000n,
          onchainInvoiceId: "0x" + crypto.randomBytes(32).toString("hex"),
        },
      });

      // 2. Create first PaymentEvent
      await prisma.paymentEvent.create({
        data: {
          invoiceId: invoice.id,
          chainId,
          txHash,
          logIndex,
          payerAddress: "0x" + crypto.randomBytes(20).toString("hex"),
          amountUsdc: 1_000_000n,
          blockNumber: 123456n,
        },
      });

      // 3. Attempting to insert duplicate PaymentEvent on (chainId, txHash, logIndex) MUST throw unique constraint violation
      await expect(
        prisma.paymentEvent.create({
          data: {
            invoiceId: invoice.id,
            chainId,
            txHash,
            logIndex,
            payerAddress: "0x" + crypto.randomBytes(20).toString("hex"),
            amountUsdc: 1_000_000n,
            blockNumber: 123457n,
          },
        })
      ).rejects.toThrow();

      // Clean up test data
      await prisma.invoice.delete({ where: { id: invoice.id } });
      await prisma.merchant.delete({ where: { id: merchant.id } });
    },
    25000
  );

  it(
    "enforces per-merchant invoiceNumber uniqueness under concurrent creation",
    async () => {
      const testWallet = "0x" + crypto.randomBytes(20).toString("hex");
      const duplicateInvoiceNumber = "INV-0001";

      const merchant = await prisma.merchant.upsert({
        where: { walletAddress: testWallet },
        update: {},
        create: {
          walletAddress: testWallet,
          displayName: "Sequential Test Merchant",
        },
      });

      // Insert first invoice
      const inv1 = await prisma.invoice.create({
        data: {
          publicId: `test_pub_seq1_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
          merchantId: merchant.id,
          invoiceNumber: duplicateInvoiceNumber,
          title: "Invoice 1",
          dueDate: new Date(Date.now() + 86400000),
          amountUsdc: 1_000_000n,
          onchainInvoiceId: "0x" + crypto.randomBytes(32).toString("hex"),
        },
      });

      // Concurrent or duplicate insert of same invoiceNumber for same merchant MUST reject
      await expect(
        prisma.invoice.create({
          data: {
            publicId: `test_pub_seq2_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
            merchantId: merchant.id,
            invoiceNumber: duplicateInvoiceNumber, // DUPLICATE for same merchant
            title: "Invoice 2",
            dueDate: new Date(Date.now() + 86400000),
            amountUsdc: 2_000_000n,
            onchainInvoiceId: "0x" + crypto.randomBytes(32).toString("hex"),
          },
        })
      ).rejects.toThrow();

      // Different merchant CAN have the same invoiceNumber (per-merchant sequential)
      const otherMerchantWallet = "0x" + crypto.randomBytes(20).toString("hex");
      const otherMerchant = await prisma.merchant.upsert({
        where: { walletAddress: otherMerchantWallet },
        update: {},
        create: {
          walletAddress: otherMerchantWallet,
          displayName: "Other Merchant",
        },
      });

      const invOther = await prisma.invoice.create({
        data: {
          publicId: `test_pub_other_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
          merchantId: otherMerchant.id,
          invoiceNumber: duplicateInvoiceNumber, // Same number, different merchant -> SUCCEEDS
          title: "Other Merchant Invoice",
          dueDate: new Date(Date.now() + 86400000),
          amountUsdc: 1_000_000n,
          onchainInvoiceId: "0x" + crypto.randomBytes(32).toString("hex"),
        },
      });
      expect(invOther.invoiceNumber).toBe(duplicateInvoiceNumber);

      // Clean up
      await prisma.invoice.delete({ where: { id: inv1.id } });
      await prisma.invoice.delete({ where: { id: invOther.id } });
      await prisma.merchant.delete({ where: { id: merchant.id } });
      await prisma.merchant.delete({ where: { id: otherMerchant.id } });
    },
    25000
  );
});
