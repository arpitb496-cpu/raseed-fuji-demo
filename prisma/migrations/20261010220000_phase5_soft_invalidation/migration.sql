-- AlterTable
ALTER TABLE "PaymentEvent" ADD COLUMN "invalidatedAt" TIMESTAMP(3),
ADD COLUMN "invalidReason" TEXT;
