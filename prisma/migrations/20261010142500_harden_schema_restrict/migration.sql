-- 1. Update Foreign Keys to ON DELETE RESTRICT
ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_merchantId_fkey";
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaymentEvent" DROP CONSTRAINT IF EXISTS "PaymentEvent_invoiceId_fkey";
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2. Add columns to PaymentEvent
ALTER TABLE "PaymentEvent" ADD COLUMN IF NOT EXISTS "routerAddress" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PaymentEvent" ADD COLUMN IF NOT EXISTS "merchantAddress" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PaymentEvent" ADD COLUMN IF NOT EXISTS "onchainInvoiceId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PaymentEvent" ADD COLUMN IF NOT EXISTS "feeUsdc" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "PaymentEvent" ADD COLUMN IF NOT EXISTS "blockHash" TEXT NOT NULL DEFAULT '';

ALTER TABLE "PaymentEvent" ALTER COLUMN "routerAddress" DROP DEFAULT;
ALTER TABLE "PaymentEvent" ALTER COLUMN "merchantAddress" DROP DEFAULT;
ALTER TABLE "PaymentEvent" ALTER COLUMN "onchainInvoiceId" DROP DEFAULT;
ALTER TABLE "PaymentEvent" ALTER COLUMN "blockHash" DROP DEFAULT;

CREATE INDEX IF NOT EXISTS "PaymentEvent_merchantAddress_idx" ON "PaymentEvent"("merchantAddress");
CREATE INDEX IF NOT EXISTS "PaymentEvent_onchainInvoiceId_idx" ON "PaymentEvent"("onchainInvoiceId");

-- 3. Create ReconciliationCursor table
CREATE TABLE IF NOT EXISTS "ReconciliationCursor" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "routerAddress" TEXT NOT NULL,
    "lastBlockNumber" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReconciliationCursor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReconciliationCursor_chainId_routerAddress_key" ON "ReconciliationCursor"("chainId", "routerAddress");

-- 4. Check constraints on Invoice financial micro-USDC fields
ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_amountUsdc_check";
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_amountUsdc_check" CHECK ("amountUsdc" >= 1000000);

ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_paidAmountUsdc_check";
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_paidAmountUsdc_check" CHECK ("paidAmountUsdc" >= 0);
