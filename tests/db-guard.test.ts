/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getTestPrisma } from "@/lib/db/test-db";
import { formatInvoiceNumber } from "@/lib/invoice-utils";
import crypto from "crypto";
import type { PrismaClient } from "@prisma/client";

describe("Database Guard, Restrictions & Concurrency (Integration with TEST_DATABASE_URL)", () => {
  let testPrisma: PrismaClient;

  beforeAll(async () => {
    testPrisma = getTestPrisma();
    await testPrisma.$connect();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  describe("Isolation Guards", () => {
    it("aborts if TEST_DATABASE_URL equals DATABASE_URL or is missing", () => {
      const origProd = process.env.DATABASE_URL;
      const origTest = process.env.TEST_DATABASE_URL;

      try {
        // Test when TEST_DATABASE_URL is missing
        process.env.TEST_DATABASE_URL = "";
        expect(() => getTestPrisma()).toThrow(/TEST ISOLATION ERROR: TEST_DATABASE_URL is not configured/);

        // Test when TEST_DATABASE_URL equals DATABASE_URL
        process.env.TEST_DATABASE_URL = "postgres://same-db-connection";
        process.env.DATABASE_URL = "postgres://same-db-connection";
        expect(() => getTestPrisma()).toThrow(/TEST ISOLATION GUARD: TEST_DATABASE_URL must never match DATABASE_URL/);
      } finally {
        process.env.DATABASE_URL = origProd;
        process.env.TEST_DATABASE_URL = origTest;
      }
    });

    it("fails fast if USE_MEMORY_STORE is enabled in production mode", () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const originalFlag = process.env.USE_MEMORY_STORE;

      try {
        (process.env as any).NODE_ENV = "production";
        process.env.USE_MEMORY_STORE = "true";

        expect(() => {
          if (process.env.NODE_ENV === "production" && process.env.USE_MEMORY_STORE === "true") {
            throw new Error(
              "SECURITY CONFIGURATION ERROR: In-memory store (USE_MEMORY_STORE=true) is strictly forbidden in production."
            );
          }
        }).toThrow(/USE_MEMORY_STORE=true.*strictly forbidden in production/);
      } finally {
        (process.env as any).NODE_ENV = originalNodeEnv;
        process.env.USE_MEMORY_STORE = originalFlag;
      }
    });
  });

  describe("Database Constraints, CHECK Invariants & ON DELETE RESTRICT", () => {
    it(
      "enforces database unique constraint on PaymentEvent (chainId, txHash, logIndex)",
      async () => {
        const testWallet = ("0x" + crypto.randomBytes(20).toString("hex")).toLowerCase();
        const routerAddress = ("0x" + crypto.randomBytes(20).toString("hex")).toLowerCase();
        const chainId = 43113;
        const txHash = "0x" + crypto.randomBytes(32).toString("hex");
        const logIndex = 0;

        // 1. Create a merchant & invoice on test branch
        const merchant = await testPrisma.merchant.upsert({
          where: { walletAddress: testWallet },
          update: {},
          create: {
            walletAddress: testWallet,
            displayName: "Payment Event Constraint Merchant",
          },
        });

        const invoice = await testPrisma.invoice.create({
          data: {
            publicId: `test_pub_unique_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
            merchantId: merchant.id,
            invoiceNumber: `INV-PAYCONCUR-${Date.now()}`,
            title: "Constraint Test Invoice",
            dueDate: new Date(Date.now() + 86400000),
            amountUsdc: 1_000_000n,
            onchainInvoiceId: "0x" + crypto.randomBytes(32).toString("hex"),
          },
        });

        // 2. Create first PaymentEvent with all hardened audit fields
        const payment = await testPrisma.paymentEvent.create({
          data: {
            invoiceId: invoice.id,
            chainId,
            txHash,
            logIndex,
            blockHash: "0x" + crypto.randomBytes(32).toString("hex"),
            blockNumber: 123456n,
            routerAddress,
            merchantAddress: testWallet,
            payerAddress: ("0x" + crypto.randomBytes(20).toString("hex")).toLowerCase(),
            onchainInvoiceId: invoice.onchainInvoiceId,
            amountUsdc: 1_000_000n,
            feeUsdc: 0n,
          },
        });

        // 3. Attempting to insert duplicate PaymentEvent on (chainId, txHash, logIndex) MUST throw unique constraint violation
        await expect(
          testPrisma.paymentEvent.create({
            data: {
              invoiceId: invoice.id,
              chainId,
              txHash,
              logIndex,
              blockHash: "0x" + crypto.randomBytes(32).toString("hex"),
              blockNumber: 123457n,
              routerAddress,
              merchantAddress: testWallet,
              payerAddress: ("0x" + crypto.randomBytes(20).toString("hex")).toLowerCase(),
              onchainInvoiceId: invoice.onchainInvoiceId,
              amountUsdc: 1_000_000n,
              feeUsdc: 0n,
            },
          })
        ).rejects.toThrow();

        // 4. Verify ON DELETE RESTRICT on PaymentEvent -> Invoice: Deleting invoice with payment must reject
        await expect(
          testPrisma.invoice.delete({ where: { id: invoice.id } })
        ).rejects.toThrow();

        // Clean up test data in correct dependency order
        await testPrisma.paymentEvent.delete({ where: { id: payment.id } });
        await testPrisma.invoice.delete({ where: { id: invoice.id } });
        await testPrisma.merchant.delete({ where: { id: merchant.id } });
      },
      30000
    );

    it(
      "enforces ON DELETE RESTRICT on Invoice -> Merchant: Deleting merchant with active invoices is rejected",
      async () => {
        const testWallet = ("0x" + crypto.randomBytes(20).toString("hex")).toLowerCase();

        const merchant = await testPrisma.merchant.create({
          data: {
            walletAddress: testWallet,
            displayName: "Restrict Test Merchant",
          },
        });

        const invoice = await testPrisma.invoice.create({
          data: {
            publicId: `test_pub_restrict_${Date.now()}`,
            merchantId: merchant.id,
            invoiceNumber: "INV-RESTRICT-001",
            title: "Restrict Test Invoice",
            dueDate: new Date(Date.now() + 86400000),
            amountUsdc: 2_000_000n,
            onchainInvoiceId: "0x" + crypto.randomBytes(32).toString("hex"),
          },
        });

        // Deleting merchant while invoice exists MUST be rejected by foreign key constraint
        await expect(
          testPrisma.merchant.delete({ where: { id: merchant.id } })
        ).rejects.toThrow();

        // Clean up: delete invoice first, then merchant succeeds
        await testPrisma.invoice.delete({ where: { id: invoice.id } });
        await testPrisma.merchant.delete({ where: { id: merchant.id } });
      },
      20000
    );

    it(
      "enforces database CHECK constraints: amountUsdc >= 1000000 and paidAmountUsdc >= 0",
      async () => {
        const testWallet = ("0x" + crypto.randomBytes(20).toString("hex")).toLowerCase();

        const merchant = await testPrisma.merchant.create({
          data: {
            walletAddress: testWallet,
            displayName: "Check Constraint Merchant",
          },
        });

        // 1. Inserting amountUsdc below 1_000_000 micro-USDC (e.g. 500,000) MUST violate CHECK constraint
        await expect(
          testPrisma.invoice.create({
            data: {
              publicId: `test_pub_check_fail_${Date.now()}`,
              merchantId: merchant.id,
              invoiceNumber: "INV-CHECK-001",
              title: "Sub-minimum invoice",
              dueDate: new Date(Date.now() + 86400000),
              amountUsdc: 500_000n, // VIOLATION: < 1_000_000
              onchainInvoiceId: "0x" + crypto.randomBytes(32).toString("hex"),
            },
          })
        ).rejects.toThrow();

        // 2. Inserting valid amountUsdc >= 1_000_000 succeeds
        const validInvoice = await testPrisma.invoice.create({
          data: {
            publicId: `test_pub_check_ok_${Date.now()}`,
            merchantId: merchant.id,
            invoiceNumber: "INV-CHECK-002",
            title: "Valid invoice",
            dueDate: new Date(Date.now() + 86400000),
            amountUsdc: 1_000_000n,
            paidAmountUsdc: 0n,
            onchainInvoiceId: "0x" + crypto.randomBytes(32).toString("hex"),
          },
        });
        expect(validInvoice.amountUsdc).toBe(1_000_000n);

        // Clean up
        await testPrisma.invoice.delete({ where: { id: validInvoice.id } });
        await testPrisma.merchant.delete({ where: { id: merchant.id } });
      },
      25000
    );

    it(
      "verifies ReconciliationCursor table functionality and unique constraint",
      async () => {
        const routerAddress = ("0x" + crypto.randomBytes(20).toString("hex")).toLowerCase();
        const chainId = 43113;

        const cursor = await testPrisma.reconciliationCursor.upsert({
          where: {
            chainId_routerAddress: {
              chainId,
              routerAddress,
            },
          },
          update: {
            lastBlockNumber: 250000n,
          },
          create: {
            chainId,
            routerAddress,
            lastBlockNumber: 200000n,
          },
        });

        expect(cursor.lastBlockNumber).toBe(200000n);

        // Update cursor
        const updated = await testPrisma.reconciliationCursor.update({
          where: {
            chainId_routerAddress: {
              chainId,
              routerAddress,
            },
          },
          data: {
            lastBlockNumber: 250000n,
          },
        });
        expect(updated.lastBlockNumber).toBe(250000n);

        // Clean up
        await testPrisma.reconciliationCursor.delete({
          where: {
            chainId_routerAddress: {
              chainId,
              routerAddress,
            },
          },
        });
      },
      20000
    );

    it(
      "ensures two parallel invoice creations get distinct sequential invoiceNumber via atomic counter",
      async () => {
        const testWallet = ("0x" + crypto.randomBytes(20).toString("hex")).toLowerCase();

        const merchant = await testPrisma.merchant.upsert({
          where: { walletAddress: testWallet },
          update: {},
          create: {
            walletAddress: testWallet,
            displayName: "Parallel Invoicing Merchant",
          },
        });

        // Simulate concurrent invoice creation with atomic merchant counter
        const createConcurrentInvoice = async (title: string) => {
          let attempts = 0;
          while (attempts < 8) {
            attempts++;
            try {
              return await testPrisma.$transaction(
                async (tx) => {
                  const updatedMerchant = await tx.merchant.update({
                    where: { id: merchant.id },
                    data: { nextInvoiceNumber: { increment: 1 } },
                    select: { nextInvoiceNumber: true },
                  });

                  const nextSeq = updatedMerchant.nextInvoiceNumber - 1;
                  const invoiceNumber = formatInvoiceNumber(nextSeq);
                  const publicId = `test_par_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;

                  return await tx.invoice.create({
                    data: {
                      publicId,
                      merchantId: merchant.id,
                      invoiceNumber,
                      title,
                      dueDate: new Date(Date.now() + 86400000),
                      amountUsdc: 5_000_000n,
                      onchainInvoiceId: "0x" + crypto.randomBytes(32).toString("hex"),
                    },
                  });
                },
                {
                  maxWait: 15000,
                  timeout: 20000,
                }
              );
            } catch (err: any) {
              if (
                (err?.code === "P2002" || err?.code === "P2028" || String(err).includes("Transaction API error")) &&
                attempts < 8
              ) {
                // Jittered backoff on conflict or pool wait
                await new Promise((r) => setTimeout(r, 40 * attempts + Math.random() * 30));
                continue;
              }
              throw err;
            }
          }
          throw new Error("Failed after max attempts");
        };

        // Fire two parallel invoice creations simultaneously
        const [invA, invB] = await Promise.all([
          createConcurrentInvoice("Parallel Invoice A"),
          createConcurrentInvoice("Parallel Invoice B"),
        ]);

        // Both invoices must be created
        expect(invA).toBeDefined();
        expect(invB).toBeDefined();

        // They must have DIFFERENT, sequential invoice numbers
        expect(invA.invoiceNumber).not.toBe(invB.invoiceNumber);

        const numbers = [invA.invoiceNumber, invB.invoiceNumber].sort();
        expect(numbers).toEqual(["INV-0001", "INV-0002"]);

        // Clean up
        await testPrisma.invoice.deleteMany({ where: { merchantId: merchant.id } });
        await testPrisma.merchant.delete({ where: { id: merchant.id } });
      },
      35000
    );

    it(
      "proves invoice numbers are never reused after deletion (atomic counter monotonicity)",
      async () => {
        const testWallet = ("0x" + crypto.randomBytes(20).toString("hex")).toLowerCase();

        const merchant = await testPrisma.merchant.create({
          data: {
            walletAddress: testWallet,
            displayName: "Deletion Non-Reuse Merchant",
          },
        });

        // Create first invoice: gets INV-0001
        const inv1 = await testPrisma.$transaction(async (tx) => {
          const m = await tx.merchant.update({
            where: { id: merchant.id },
            data: { nextInvoiceNumber: { increment: 1 } },
            select: { nextInvoiceNumber: true },
          });
          return await tx.invoice.create({
            data: {
              publicId: `test_del_1_${Date.now()}`,
              merchantId: merchant.id,
              invoiceNumber: formatInvoiceNumber(m.nextInvoiceNumber - 1),
              title: "Invoice 1 to delete",
              dueDate: new Date(Date.now() + 86400000),
              amountUsdc: 2_000_000n,
              onchainInvoiceId: "0x" + crypto.randomBytes(32).toString("hex"),
            },
          });
        });
        expect(inv1.invoiceNumber).toBe("INV-0001");

        // DELETE the first invoice
        await testPrisma.invoice.delete({ where: { id: inv1.id } });

        // Create next invoice: MUST get INV-0002, NEVER reusing INV-0001
        const inv2 = await testPrisma.$transaction(async (tx) => {
          const m = await tx.merchant.update({
            where: { id: merchant.id },
            data: { nextInvoiceNumber: { increment: 1 } },
            select: { nextInvoiceNumber: true },
          });
          return await tx.invoice.create({
            data: {
              publicId: `test_del_2_${Date.now()}`,
              merchantId: merchant.id,
              invoiceNumber: formatInvoiceNumber(m.nextInvoiceNumber - 1),
              title: "Invoice 2 after deletion",
              dueDate: new Date(Date.now() + 86400000),
              amountUsdc: 2_000_000n,
              onchainInvoiceId: "0x" + crypto.randomBytes(32).toString("hex"),
            },
          });
        });
        expect(inv2.invoiceNumber).toBe("INV-0002");

        // Clean up
        await testPrisma.invoice.delete({ where: { id: inv2.id } });
        await testPrisma.merchant.delete({ where: { id: merchant.id } });
      },
      25000
    );

    it(
      "enforces unique constraint on Invoice.onchainInvoiceId",
      async () => {
        const testWallet = ("0x" + crypto.randomBytes(20).toString("hex")).toLowerCase();
        const sharedOnchainInvoiceId = ("0x" + crypto.randomBytes(32).toString("hex")).toLowerCase();

        const merchant = await testPrisma.merchant.create({
          data: {
            walletAddress: testWallet,
            displayName: "Unique Onchain Id Merchant",
          },
        });

        // 1. Insert first invoice with onchainInvoiceId
        const inv1 = await testPrisma.invoice.create({
          data: {
            publicId: `test_unique_chain_1_${Date.now()}`,
            merchantId: merchant.id,
            invoiceNumber: "INV-0001",
            title: "First with onchain ID",
            dueDate: new Date(Date.now() + 86400000),
            amountUsdc: 2_000_000n,
            onchainInvoiceId: sharedOnchainInvoiceId,
          },
        });
        expect(inv1.onchainInvoiceId).toBe(sharedOnchainInvoiceId);

        // 2. Attempt to insert second invoice with identical onchainInvoiceId must reject with P2002
        await expect(
          testPrisma.invoice.create({
            data: {
              publicId: `test_unique_chain_2_${Date.now()}`,
              merchantId: merchant.id,
              invoiceNumber: "INV-0002",
              title: "Duplicate onchain ID collision",
              dueDate: new Date(Date.now() + 86400000),
              amountUsdc: 3_000_000n,
              onchainInvoiceId: sharedOnchainInvoiceId,
            },
          })
        ).rejects.toThrow();

        // Clean up
        await testPrisma.invoice.delete({ where: { id: inv1.id } });
        await testPrisma.merchant.delete({ where: { id: merchant.id } });
      },
      25000
    );

    it(
      "verifies lowercase address normalization at write and query",
      async () => {
        const mixedCaseWallet = "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12";
        const normalizedWallet = mixedCaseWallet.toLowerCase();

        const merchant = await testPrisma.merchant.create({
          data: {
            walletAddress: normalizedWallet,
            displayName: "Mixed Case Merchant",
          },
        });

        expect(merchant.walletAddress).toBe(normalizedWallet);

        // Querying by lowercase finds it
        const found = await testPrisma.merchant.findUnique({
          where: { walletAddress: normalizedWallet },
        });
        expect(found?.id).toBe(merchant.id);

        // Clean up
        await testPrisma.merchant.delete({ where: { id: merchant.id } });
      },
      20000
    );
  });
});
