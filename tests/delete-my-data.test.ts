import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getTestPrisma } from "@/lib/db/test-db";
import crypto from "crypto";
import type { PrismaClient } from "@prisma/client";

describe("Delete My Data & Anonymization Policy (Integration with TEST_DATABASE_URL)", () => {
  let testPrisma: PrismaClient;

  beforeAll(async () => {
    testPrisma = getTestPrisma();
    await testPrisma.$connect();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it(
    "anonymizes personal fields and preserves immutable payment records when merchant has PAID invoices",
    async () => {
      const walletAddress = "0x" + crypto.randomBytes(20).toString("hex");

      // 1. Create merchant with personal data
      const merchant = await testPrisma.merchant.create({
        data: {
          walletAddress,
          displayName: "Arjun Verma",
          businessName: "Verma Cloud Consulting",
          country: "India",
        },
      });

      // 2. Create paid invoice with client PII and PaymentEvent
      const paidInvoice = await testPrisma.invoice.create({
        data: {
          publicId: `test_anon_paid_${Date.now()}`,
          merchantId: merchant.id,
          invoiceNumber: "INV-ANON-001",
          title: "Architecture Consulting",
          clientName: "Rohan Gupta",
          clientEmail: "rohan@gupta.com",
          notes: "Sensitive internal project details",
          amountUsdc: 500_000_000n,
          paidAmountUsdc: 500_000_000n,
          status: "PAID",
          dueDate: new Date(Date.now() + 86400000),
          onchainInvoiceId: "0x" + crypto.randomBytes(32).toString("hex"),
        },
      });

      const paymentEvent = await testPrisma.paymentEvent.create({
        data: {
          invoiceId: paidInvoice.id,
          chainId: 43113,
          txHash: "0x" + crypto.randomBytes(32).toString("hex"),
          logIndex: 0,
          payerAddress: "0x" + crypto.randomBytes(20).toString("hex"),
          amountUsdc: 500_000_000n,
          blockNumber: 998877n,
        },
      });

      // Also create an unpaid draft that should be cleaned up
      const draftInvoice = await testPrisma.invoice.create({
        data: {
          publicId: `test_anon_draft_${Date.now()}`,
          merchantId: merchant.id,
          invoiceNumber: "INV-ANON-002",
          title: "Abandoned Draft",
          amountUsdc: 100_000_000n,
          status: "DRAFT",
          dueDate: new Date(Date.now() + 86400000),
          onchainInvoiceId: "0x" + crypto.randomBytes(32).toString("hex"),
        },
      });

      // 3. Execute "Delete My Data" Anonymization logic (matching /api/merchant/profile DELETE)
      const financialRecordsCount = await testPrisma.invoice.count({
        where: {
          merchantId: merchant.id,
          OR: [
            { status: "PAID" },
            { status: "PARTIALLY_PAID" },
            { paymentEvents: { some: {} } },
          ],
        },
      });

      expect(financialRecordsCount).toBe(1);

      await testPrisma.$transaction(async (tx) => {
        // Anonymize merchant
        await tx.merchant.update({
          where: { id: merchant.id },
          data: {
            displayName: "Anonymized Merchant",
            businessName: null,
            country: null,
          },
        });

        // Anonymize client PII on paid invoice
        await tx.invoice.updateMany({
          where: { merchantId: merchant.id },
          data: {
            clientName: "Anonymized Client",
            clientEmail: null,
            notes: null,
          },
        });

        // Clean up unpaid drafts
        await tx.invoice.deleteMany({
          where: {
            merchantId: merchant.id,
            status: { in: ["DRAFT", "CANCELLED"] },
            paymentEvents: { none: {} },
          },
        });
      });

      // 4. Verify post-anonymization state
      const updatedMerchant = await testPrisma.merchant.findUnique({
        where: { id: merchant.id },
      });
      expect(updatedMerchant?.displayName).toBe("Anonymized Merchant");
      expect(updatedMerchant?.businessName).toBeNull();
      expect(updatedMerchant?.country).toBeNull();

      // Check paid invoice: client PII wiped, financial ledger preserved
      const updatedInvoice = await testPrisma.invoice.findUnique({
        where: { id: paidInvoice.id },
      });
      expect(updatedInvoice?.clientName).toBe("Anonymized Client");
      expect(updatedInvoice?.clientEmail).toBeNull();
      expect(updatedInvoice?.notes).toBeNull();
      expect(updatedInvoice?.amountUsdc).toBe(500_000_000n);
      expect(updatedInvoice?.status).toBe("PAID");

      // Check PaymentEvent is completely intact
      const preservedPayment = await testPrisma.paymentEvent.findUnique({
        where: { id: paymentEvent.id },
      });
      expect(preservedPayment).not.toBeNull();
      expect(preservedPayment?.txHash).toBe(paymentEvent.txHash);
      expect(preservedPayment?.amountUsdc).toBe(500_000_000n);

      // Check draft was deleted
      const deletedDraft = await testPrisma.invoice.findUnique({
        where: { id: draftInvoice.id },
      });
      expect(deletedDraft).toBeNull();

      // Clean up test data
      await testPrisma.paymentEvent.delete({ where: { id: paymentEvent.id } });
      await testPrisma.invoice.delete({ where: { id: paidInvoice.id } });
      await testPrisma.merchant.delete({ where: { id: merchant.id } });
    },
    30000
  );
});
