import { prisma } from "@/lib/db";
import { Prisma, InvoiceStatus, type PrismaClient } from "@prisma/client";
import { getServerPublicClient } from "@/lib/blockchain/client";
import { CURRENT_NETWORK } from "@/config/network";
import { PAID_EVENT_ABI } from "./verification";
import { recomputeInvoiceSettlement } from "./settlement-engine";
import crypto from "crypto";
import { createPublicClient, http, type PublicClient } from "viem";

import deploymentsData from "../../../contracts/deployments.json";

export const REORG_LOOKBACK_BLOCKS = 12n;
export const MAX_RECONCILE_BLOCK_RANGE = 2000n;

export function getRouterDeployBlock(chainId: number): bigint {
  const fuji = (deploymentsData as { fuji?: { deployBlock?: number } }).fuji;
  const mainnet = (deploymentsData as { mainnet?: { deployBlock?: number } }).mainnet;
  if (chainId === 43113 && fuji?.deployBlock) {
    return BigInt(fuji.deployBlock);
  }
  if (chainId === 43114 && mainnet?.deployBlock) {
    return BigInt(mainnet.deployBlock);
  }
  return 0n;
}

export interface ReconcileResult {
  acquiredLock: boolean;
  fromBlock?: bigint;
  toBlock?: bigint;
  latestBlock?: bigint;
  logsFound?: number;
  newEventsStored?: number;
  invoicesSettled?: number;
  expiredInvoicesCount?: number;
  message?: string;
}

export function verifyCronAuthorization(authHeader?: string | null): {
  authorized: boolean;
  error?: string;
  statusCode?: number;
} {
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === "production" && !cronSecret) {
    return {
      authorized: false,
      error: "CRON_SECRET is strictly required in production but unset",
      statusCode: 500,
    };
  }

  if (!cronSecret) {
    return {
      authorized: false,
      error: "CRON_SECRET is not configured",
      statusCode: 401,
    };
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      authorized: false,
      error: "Missing or malformed Authorization header (Bearer token required)",
      statusCode: 401,
    };
  }

  const providedToken = authHeader.slice("Bearer ".length).trim();
  const tokenBuf = Buffer.from(providedToken);
  const secretBuf = Buffer.from(cronSecret);

  if (tokenBuf.length !== secretBuf.length || !crypto.timingSafeEqual(tokenBuf, secretBuf)) {
    return {
      authorized: false,
      error: "Invalid cron secret authorization",
      statusCode: 401,
    };
  }

  return { authorized: true };
}

export const DEFAULT_MAX_CHUNKS_PER_RUN = 15;
export const DEFAULT_RECONCILE_TIME_BUDGET_MS = 25_000;

export interface ReconcileResult {
  acquiredLock: boolean;
  fromBlock?: bigint;
  toBlock?: bigint;
  latestBlock?: bigint;
  logsFound?: number;
  newEventsStored?: number;
  invoicesSettled?: number;
  expiredInvoicesCount?: number;
  chunksProcessed?: number;
  message?: string;
}

export function sanitizeLogMessage(msg: string): string {
  // Redact URLs containing API keys/tokens or query params
  return msg.replace(/https?:\/\/[^\s"'<>]+/gi, "[REDACTED_RPC_URL]").slice(0, 200);
}

export function isRpcBlockRangeOrLimitError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;

  const candidate = err as {
    code?: number | string;
    status?: number;
    message?: string;
    details?: string;
    shortMessage?: string;
    cause?: unknown;
  };

  const code = typeof candidate.code === "number" ? candidate.code : undefined;
  if (code === -32600 || code === -32005) {
    return true;
  }

  const status = typeof candidate.status === "number" ? candidate.status : undefined;
  if (status === 413) {
    return true;
  }

  const texts: string[] = [];
  if (typeof candidate.message === "string") texts.push(candidate.message);
  if (typeof candidate.details === "string") texts.push(candidate.details);
  if (typeof candidate.shortMessage === "string") texts.push(candidate.shortMessage);

  if (candidate.cause && typeof candidate.cause === "object") {
    const causeObj = candidate.cause as { code?: number | string; message?: string; details?: string; shortMessage?: string };
    if (causeObj.code === -32600 || causeObj.code === -32005) return true;
    if (typeof causeObj.message === "string") texts.push(causeObj.message);
    if (typeof causeObj.details === "string") texts.push(causeObj.details);
    if (typeof causeObj.shortMessage === "string") texts.push(causeObj.shortMessage);
  }

  const combined = texts.join(" ").toLowerCase();
  const patterns = [
    "block range",
    "free tier",
    "eth_getlogs",
    "query exceeds",
    "exceeds maximum",
    "maximum block",
    "limit exceeded",
    "range is too wide",
    "block filter",
  ];

  return patterns.some((p) => combined.includes(p));
}

interface DecodedPaidLog {
  args: {
    invoiceId: `0x${string}`;
    payer: `0x${string}`;
    merchant: `0x${string}`;
    amount: bigint;
    fee: bigint;
  };
  transactionHash: `0x${string}`;
  logIndex: number;
  blockHash: `0x${string}`;
  blockNumber: bigint;
}

async function fetchLogsWithFallback(
  client: PublicClient,
  routerAddress: `0x${string}`,
  fromBlock: bigint,
  toBlock: bigint
): Promise<DecodedPaidLog[]> {
  try {
    return (await client.getLogs({
      address: routerAddress,
      event: PAID_EVENT_ABI,
      fromBlock,
      toBlock,
    })) as unknown as DecodedPaidLog[];
  } catch (err: unknown) {
    if (isRpcBlockRangeOrLimitError(err)) {
      const sanitizedReason = sanitizeLogMessage(err instanceof Error ? err.message : String(err));
      console.warn(
        `[reconciliation] WARN: Provider block range limit detected; falling back to public RPC transport. Reason: ${sanitizedReason}`
      );
      const fallbackClient = createPublicClient({
        chain: CURRENT_NETWORK.chain,
        transport: http(CURRENT_NETWORK.rpcUrl),
      });
      return (await fallbackClient.getLogs({
        address: routerAddress,
        event: PAID_EVENT_ABI,
        fromBlock,
        toBlock,
      })) as unknown as DecodedPaidLog[];
    }
    throw err;
  }
}

export interface RunReconciliationOptions {
  publicClient?: PublicClient;
  chainId?: number;
  routerAddress?: string;
  prismaClient?: PrismaClient;
  lockKey?: string;
  maxChunks?: number;
  timeBudgetMs?: number;
}

export async function runReconciliation(
  options?: RunReconciliationOptions
): Promise<ReconcileResult> {
  const db = options?.prismaClient || prisma;
  const lockKey = options?.lockKey ?? "raseed_reconciliation_cron";
  const chainId = options?.chainId ?? CURRENT_NETWORK.chain.id;
  const rawRouter = options?.routerAddress ?? CURRENT_NETWORK.routerAddress;
  if (!rawRouter) {
    throw new Error("RECONCILIATION ERROR: Router address is null or unconfigured for active network.");
  }
  const routerAddress = rawRouter.toLowerCase();
  const client = options?.publicClient ?? getServerPublicClient(chainId);
  const maxChunks = options?.maxChunks ?? DEFAULT_MAX_CHUNKS_PER_RUN;
  const timeBudgetMs = options?.timeBudgetMs ?? DEFAULT_RECONCILE_TIME_BUDGET_MS;
  const startTime = Date.now();

  const affectedInvoiceIds = new Set<string>();
  let totalNewEventsStored = 0;
  let overdueCount = 0;

  // Open PostgreSQL transaction with advisory lock and explicit timeout
  const executeReconcile = async (tx: Prisma.TransactionClient): Promise<ReconcileResult> => {
    // Acquire PostgreSQL transaction advisory lock (pooler and PgBouncer safe)
    const lockQuery = await tx.$queryRaw<Array<{ acquired: boolean }>>`
      SELECT pg_try_advisory_xact_lock(hashtext(${lockKey})) as acquired
    `;
    const acquired = lockQuery[0]?.acquired;

    if (!acquired) {
      return {
        acquiredLock: false,
        message: "Another reconciliation job is currently executing. Execution skipped.",
      };
    }

    // 1. Fetch current cursor from database
    const cursor = await tx.reconciliationCursor.findUnique({
      where: {
        chainId_routerAddress: {
          chainId,
          routerAddress,
        },
      },
    });

    const latestBlock = await client.getBlockNumber();

    let currentFromBlock: bigint;
    if (cursor) {
      currentFromBlock =
        cursor.lastBlockNumber > REORG_LOOKBACK_BLOCKS
          ? cursor.lastBlockNumber - REORG_LOOKBACK_BLOCKS
          : 0n;
    } else {
      currentFromBlock = getRouterDeployBlock(chainId);
    }

    const initialFromBlock = currentFromBlock;
    let lastProcessedToBlock = currentFromBlock;
    let totalLogsCount = 0;
    let chunksProcessed = 0;

    // Process multiple chunks bounded by maxChunks and time budget
    while (
      chunksProcessed < maxChunks &&
      Date.now() - startTime < timeBudgetMs &&
      currentFromBlock <= latestBlock
    ) {
      const toBlock =
        currentFromBlock + MAX_RECONCILE_BLOCK_RANGE > latestBlock
          ? latestBlock
          : currentFromBlock + MAX_RECONCILE_BLOCK_RANGE;

      if (toBlock < currentFromBlock) {
        break;
      }

      const chunkLogs = await fetchLogsWithFallback(
        client,
        routerAddress as `0x${string}`,
        currentFromBlock,
        toBlock
      );

      totalLogsCount += chunkLogs.length;

      for (const log of chunkLogs) {
        const args = log.args;
        const logInvoiceId = args.invoiceId.toLowerCase();
        const logMerchant = args.merchant.toLowerCase();

        // Find matching invoice by onchainInvoiceId and merchant wallet
        const invoice = await tx.invoice.findFirst({
          where: {
            onchainInvoiceId: logInvoiceId,
            merchant: {
              walletAddress: logMerchant,
            },
          },
          select: { id: true },
        });

        if (!invoice) continue;

        // Idempotently upsert PaymentEvent with re-validation if previously soft-invalidated
        await tx.paymentEvent.upsert({
          where: {
            chainId_txHash_logIndex: {
              chainId,
              txHash: log.transactionHash.toLowerCase(),
              logIndex: log.logIndex,
            },
          },
          update: {
            invalidatedAt: null,
            invalidReason: null,
            blockHash: log.blockHash.toLowerCase(),
            blockNumber: log.blockNumber,
          },
          create: {
            invoiceId: invoice.id,
            txHash: log.transactionHash.toLowerCase(),
            logIndex: log.logIndex,
            blockHash: log.blockHash.toLowerCase(),
            blockNumber: log.blockNumber,
            chainId,
            routerAddress,
            merchantAddress: logMerchant,
            payerAddress: args.payer.toLowerCase(),
            onchainInvoiceId: logInvoiceId,
            amountUsdc: BigInt(args.amount),
            feeUsdc: BigInt(args.fee),
          },
        });

        totalNewEventsStored++;
        affectedInvoiceIds.add(invoice.id);
      }

      // Persist cursor after each completed chunk
      await tx.reconciliationCursor.upsert({
        where: {
          chainId_routerAddress: {
            chainId,
            routerAddress,
          },
        },
        create: {
          id: `cursor_${chainId}_${routerAddress}`,
          chainId,
          routerAddress,
          lastBlockNumber: toBlock,
        },
        update: {
          lastBlockNumber: toBlock,
        },
      });

      lastProcessedToBlock = toBlock;
      chunksProcessed++;

      if (toBlock >= latestBlock) {
        break;
      }

      currentFromBlock =
        toBlock > REORG_LOOKBACK_BLOCKS
          ? toBlock - REORG_LOOKBACK_BLOCKS
          : 0n;
    }

    // Include unsettled invoices
    const unsettledInvoices = await tx.invoice.findMany({
      where: {
        status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.DRAFT] },
        paymentEvents: { some: { invalidatedAt: null } },
      },
      select: { id: true },
    });
    for (const u of unsettledInvoices) {
      affectedInvoiceIds.add(u.id);
    }

    // Mark unpaid SENT invoices past due as EXPIRED using atomic conditional update
    const now = new Date();
    const overdueCandidates = await tx.invoice.findMany({
      where: {
        status: InvoiceStatus.SENT,
        dueDate: { lt: now },
        paidAmountUsdc: 0n,
      },
      select: {
        id: true,
        merchantId: true,
        dueDate: true,
      },
    });

    let actuallyExpiredCount = 0;
    for (const candidate of overdueCandidates) {
      const updateResult = await tx.invoice.updateMany({
        where: {
          id: candidate.id,
          status: InvoiceStatus.SENT,
          paidAmountUsdc: 0n,
          dueDate: { lt: now },
        },
        data: {
          status: InvoiceStatus.EXPIRED,
        },
      });

      if (updateResult.count === 1) {
        actuallyExpiredCount++;
        await tx.auditLog.create({
          data: {
            merchantId: candidate.merchantId,
            invoiceId: candidate.id,
            action: "INVOICE_EXPIRED_BY_RECONCILIATION",
            details: JSON.stringify({
              dueDate: candidate.dueDate.toISOString(),
              statusTransition: "SENT -> EXPIRED",
            }),
          },
        });
      }
    }
    overdueCount = actuallyExpiredCount;

    return {
      acquiredLock: true,
      fromBlock: initialFromBlock,
      toBlock: lastProcessedToBlock,
      latestBlock,
      logsFound: totalLogsCount,
      newEventsStored: totalNewEventsStored,
      invoicesSettled: affectedInvoiceIds.size,
      expiredInvoicesCount: overdueCount,
      chunksProcessed,
      message: "Reconciliation completed successfully",
    };
  };

  let result: ReconcileResult;
  if (!("$transaction" in db) || typeof db.$transaction !== "function") {
    result = await executeReconcile(db as Prisma.TransactionClient);
  } else {
    result = await (db as PrismaClient).$transaction(executeReconcile, {
      maxWait: 15000,
      timeout: 60000,
    });
  }

  // 5. Trigger settlement engine recomputation for affected invoices outside advisory lock
  if (result.acquiredLock) {
    for (const invId of affectedInvoiceIds) {
      await recomputeInvoiceSettlement(invId, {
        publicClient: client,
        prismaClient: db,
      });
    }
  }

  return result;
}
