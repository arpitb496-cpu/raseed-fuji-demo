import { prisma } from "@/lib/db";
import { InvoiceStatus, type PrismaClient, type Prisma } from "@prisma/client";
import { getServerPublicClient } from "@/lib/blockchain/client";
import type { PublicClient } from "viem";

export const DUST_MICRO_USDC = 10_000n; // 0.01 USDC = 10,000 micro-units
export const DEFAULT_CONFIRMATIONS = 3;

export interface SettlementResult {
  invoiceId: string;
  previousStatus: InvoiceStatus;
  newStatus: InvoiceStatus;
  paidAmountUsdc: bigint;
  totalEventsCount: number;
  validEventsCount: number;
  invalidatedReorgCount: number;
  isOverpaid: boolean;
  isLate: boolean;
  hasDust: boolean;
  warnings: string[];
}

export async function recomputeInvoiceSettlement(
  invoiceId: string,
  options?: {
    publicClient?: PublicClient;
    confirmations?: number;
    prismaClient?: PrismaClient | Prisma.TransactionClient;
  }
): Promise<SettlementResult> {
  const db = options?.prismaClient || prisma;
  const confirmations = BigInt(
    options?.confirmations ??
      (process.env.CONFIRMATIONS ? parseInt(process.env.CONFIRMATIONS, 10) : DEFAULT_CONFIRMATIONS)
  );

  // 1. Fetch current payment event block numbers OUTSIDE any transaction to determine RPC requirements
  const preCheck = await db.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      paymentEvents: {
        select: { blockNumber: true },
      },
    },
  });

  if (!preCheck) {
    throw new Error(`Invoice ${invoiceId} not found for settlement`);
  }

  const client = options?.publicClient || getServerPublicClient();

  // 2. Pre-fetch chain data strictly BEFORE opening the database transaction
  // (Prevents holding database locks during slow RPC calls or network latency)
  let latestBlockNumber: bigint;
  try {
    latestBlockNumber = await client.getBlockNumber();
  } catch (err) {
    throw new Error(`RPC block check failed during settlement: ${err instanceof Error ? err.message : String(err)}`);
  }

  const uniqueBlockNumbers = Array.from(new Set(preCheck.paymentEvents.map((e) => e.blockNumber)));
  const canonicalBlockHashes = new Map<bigint, string>();

  for (const blockNumber of uniqueBlockNumbers) {
    try {
      const canonicalBlock = await client.getBlock({ blockNumber });
      canonicalBlockHashes.set(blockNumber, canonicalBlock.hash.toLowerCase());
    } catch (err) {
      throw new Error(`RPC block lookup failed for block ${blockNumber}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 3. Execute database mutation inside transaction with PostgreSQL row-level lock (FOR UPDATE)
  const executeSettlement = async (tx: Prisma.TransactionClient): Promise<SettlementResult> => {
    // Acquire exclusive row lock on Invoice to prevent race conditions with reports & cron
    await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${invoiceId} FOR UPDATE`;

    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        paymentEvents: {
          orderBy: { blockNumber: "asc" },
        },
        merchant: true,
      },
    });

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found for settlement`);
    }

    const warnings: string[] = [];
    let invalidatedReorgCount = 0;
    const validEvents: typeof invoice.paymentEvents = [];

    // 4. Validate confirmations and canonical block hashes from pre-fetched chain data
    for (const event of invoice.paymentEvents) {
      const confirmationsCount = latestBlockNumber - event.blockNumber + 1n;
      if (confirmationsCount < confirmations) {
        // Event has not reached required N confirmations yet: skip from settlement sum for now
        continue;
      }

      const canonicalHash = canonicalBlockHashes.get(event.blockNumber);
      const isCanonical = canonicalHash && canonicalHash === event.blockHash.toLowerCase();

      if (!isCanonical) {
        // Block hash mismatch => Reorg / orphaned chain! Soft-invalidate if not already invalidated
        if (!event.invalidatedAt) {
          await tx.paymentEvent.update({
            where: { id: event.id },
            data: {
              invalidatedAt: new Date(),
              invalidReason: `Canonical block hash mismatch: stored ${event.blockHash}, canonical ${canonicalHash || "unknown"}`,
            },
          });
          await tx.auditLog.create({
            data: {
              merchantId: invoice.merchantId,
              invoiceId: invoice.id,
              action: "REORG_EVENT_INVALIDATED",
              details: JSON.stringify({
                txHash: event.txHash,
                logIndex: event.logIndex,
                storedBlockHash: event.blockHash,
                canonicalBlockHash: canonicalHash,
                blockNumber: event.blockNumber.toString(),
              }),
            },
          });
        }
        invalidatedReorgCount++;
        continue;
      } else if (event.invalidatedAt) {
        // Event was previously invalidated, but is now canonical again! Re-validate it
        await tx.paymentEvent.update({
          where: { id: event.id },
          data: {
            invalidatedAt: null,
            invalidReason: null,
          },
        });
        await tx.auditLog.create({
          data: {
            merchantId: invoice.merchantId,
            invoiceId: invoice.id,
            action: "REORG_EVENT_REVALIDATED",
            details: JSON.stringify({
              txHash: event.txHash,
              logIndex: event.logIndex,
              blockNumber: event.blockNumber.toString(),
            }),
          },
        });
      }

      validEvents.push(event);
    }

    // 5. Financial math & flags (strictly excludes soft-invalidated events)
    let validPaidSum = 0n;
    let nonDustPaidSum = 0n;
    let hasDust = false;

    for (const ev of validEvents) {
      validPaidSum += ev.amountUsdc;
      if (ev.amountUsdc < DUST_MICRO_USDC) {
        hasDust = true;
      } else {
        nonDustPaidSum += ev.amountUsdc;
      }
    }

    const previousStatus = invoice.status;
    let newStatus = invoice.status;
    const isOverpaid = validPaidSum > invoice.amountUsdc;
    let isLate = false;

    // Check if any payment occurred past due date
    const now = new Date();
    const isPastDue = now > invoice.dueDate;
    if (validEvents.length > 0 && isPastDue) {
      isLate = true;
    }

    // 6. Status transitions based on settlement rules
    if (invoice.status === InvoiceStatus.CANCELLED) {
      // Payment to cancelled invoice: status remains CANCELLED; flag to merchant
      newStatus = InvoiceStatus.CANCELLED;
      if (validEvents.length > 0) {
        warnings.push("PAYMENT_ON_CANCELLED_INVOICE");
        await tx.auditLog.create({
          data: {
            merchantId: invoice.merchantId,
            invoiceId: invoice.id,
            action: "PAYMENT_ON_CANCELLED_INVOICE",
            details: JSON.stringify({
              totalReceivedUsdc: validPaidSum.toString(),
              eventsCount: validEvents.length,
            }),
          },
        });
      }
    } else {
      if (validPaidSum >= invoice.amountUsdc) {
        newStatus = InvoiceStatus.PAID;
      } else if (nonDustPaidSum >= DUST_MICRO_USDC) {
        // Between dust and amount => PARTIALLY_PAID
        newStatus = InvoiceStatus.PARTIALLY_PAID;
      } else {
        // Only dust payments (< 10,000 micro-USDC) received: payments < 0.01 USDC NEVER change status on their own
        newStatus = previousStatus;
      }

      // Overpayment flag & audit
      if (isOverpaid) {
        warnings.push("OVERPAYMENT_RECEIVED");
        await tx.auditLog.create({
          data: {
            merchantId: invoice.merchantId,
            invoiceId: invoice.id,
            action: "OVERPAYMENT_RECEIVED",
            details: JSON.stringify({
              targetAmountUsdc: invoice.amountUsdc.toString(),
              paidAmountUsdc: validPaidSum.toString(),
              overpaidUsdc: (validPaidSum - invoice.amountUsdc).toString(),
            }),
          },
        });
      }

      // Late payment flag & audit
      if (isLate) {
        warnings.push("LATE_PAYMENT_RECEIVED");
        await tx.auditLog.create({
          data: {
            merchantId: invoice.merchantId,
            invoiceId: invoice.id,
            action: "LATE_PAYMENT_RECEIVED",
            details: JSON.stringify({
              dueDate: invoice.dueDate.toISOString(),
              paidAmountUsdc: validPaidSum.toString(),
            }),
          },
        });
      }
    }

    // 7. Update Invoice record
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAmountUsdc: validPaidSum,
        status: newStatus,
      },
    });

    return {
      invoiceId: invoice.id,
      previousStatus,
      newStatus,
      paidAmountUsdc: validPaidSum,
      totalEventsCount: invoice.paymentEvents.length,
      validEventsCount: validEvents.length,
      invalidatedReorgCount,
      isOverpaid,
      isLate,
      hasDust,
      warnings,
    };
  };

  // If already inside an existing transaction, execute directly
  if (!("$transaction" in db) || typeof db.$transaction !== "function") {
    return await executeSettlement(db as Prisma.TransactionClient);
  }

  // Explicit timeout and maxWait on transaction
  return await (db as PrismaClient).$transaction(executeSettlement, {
    maxWait: 10000,
    timeout: 20000,
  });
}
