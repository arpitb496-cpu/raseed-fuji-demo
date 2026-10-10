-- Step 0 Migration: Address Lowercase Normalization, Merchant Atomic Counter, Unique OnchainInvoiceId

-- 1. Normalize all addresses in existing rows to lowercase
UPDATE "Merchant" SET "walletAddress" = LOWER("walletAddress");
UPDATE "PaymentEvent" SET "routerAddress" = LOWER("routerAddress"), "merchantAddress" = LOWER("merchantAddress"), "payerAddress" = LOWER("payerAddress");
UPDATE "ReconciliationCursor" SET "routerAddress" = LOWER("routerAddress");

-- 2. Add nextInvoiceNumber atomic counter column to Merchant
ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "nextInvoiceNumber" INTEGER NOT NULL DEFAULT 1;

-- Backfill nextInvoiceNumber for any existing merchants with invoices
UPDATE "Merchant" m
SET "nextInvoiceNumber" = COALESCE(
  (
    SELECT MAX(CAST(SUBSTRING(i."invoiceNumber" FROM 'INV-([0-9]+)') AS INTEGER)) + 1
    FROM "Invoice" i
    WHERE i."merchantId" = m."id"
  ),
  1
);

-- 3. Add @unique constraint on Invoice.onchainInvoiceId
DROP INDEX IF EXISTS "Invoice_onchainInvoiceId_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_onchainInvoiceId_key" ON "Invoice"("onchainInvoiceId");
