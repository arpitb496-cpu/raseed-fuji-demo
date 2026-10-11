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

export async function runReconciliation(options?: {
  publicClient?: PublicClient;
  chainId?: number;
  routerAddress?: string;
  prismaClient?: PrismaClient;
  lockKey?: string;
}): Promise<ReconcileResult> {
  const db = options?.prismaClient || prisma;
  const lockKey = options?.lockKey ?? "raseed_reconciliation_cron";
  const chainId = options?.chainId ?? CURRENT_NETWORK.chain.id;
  const rawRouter = options?.routerAddress ?? CURRENT_NETWORK.routerAddress;
  if (!rawRouter) {
    throw new Error("RECONCILIATION ERROR: Router address is null or unconfigured for active network.");
  }
  const routerAddress = rawRouter.toLowerCase();
  const client = options?.publicClient ?? getServerPublicClient(chainId);

  // 1. Fetch cursor outside transaction to determine RPC block range
  const cursor = await db.reconciliationCursor.findUnique({
    where: {
      chainId_routerAddress: {
        chainId,
        routerAddress,
      },
    },
  });

  // 2. Pre-fetch blockchain data strictly OUTSIDE the database transaction
  // (Prevents holding database locks during slow RPC calls or network roundtrips)
  const latestBlock = await client.getBlockNumber();

  let fromBlock: bigint;
  if (cursor) {
    fromBlock =
      cursor.lastBlockNumber > REORG_LOOKBACK_BLOCKS
        ? cursor.lastBlockNumber - REORG_LOOKBACK_BLOCKS
        : 0n;
  } else {
    // If first run, start from router deployment block in deployments.json
    const deployBlock = getRouterDeployBlock(chainId);
    fromBlock = deployBlock;
  }

  const toBlock =
    fromBlock + MAX_RECONCILE_BLOCK_RANGE > latestBlock
      ? latestBlock
      : fromBlock + MAX_RECONCILE_BLOCK_RANGE;

  // 3. Pre-fetch logs from router address via RPC strictly OUTSIDE the transaction
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
  let logs: DecodedPaidLog[] = [];
  if (toBlock >= fromBlock) {
    try {
      logs = (await client.getLogs({
        address: routerAddress as `0x${string}`,
        event: PAID_EVENT_ABI,
        fromBlock,
        toBlock,
      })) as unknown as DecodedPaidLog[];
    } catch (err: unknown) {
      const rpcErr = err as { message?: string; details?: string; code?: number };
      if (
        rpcErr?.message?.includes("block range") ||
        rpcErr?.details?.includes("block range") ||
        rpcErr?.code === -32600
      ) {
        const fallbackClient = createPublicClient({
          chain: CURRENT_NETWORK.chain,
          transport: http(CURRENT_NETWORK.rpcUrl),
        });
        logs = (await fallbackClient.getLogs({
          address: routerAddress as `0x${string}`,
          event: PAID_EVENT_ABI,
          fromBlock,
          toBlock,
        })) as unknown as DecodedPaidLog[];
      } else {
        throw err;
      }
    }
  }

  const affectedInvoiceIds = new Set<string>();
  let newEventsStored = 0;
  let overdueCount = 0;

  // 4. Open PostgreSQL transaction with advisory lock and explicit timeout
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

    for (const log of logs) {
      const args = log.args as {
        invoiceId: `0x${string}`;
        payer: `0x${string}`;
        merchant: `0x${string}`;
        amount: bigint;
        fee: bigint;
      };

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

      newEventsStored++;
      affectedInvoiceIds.add(invoice.id);
    }

    // Also include any invoices with recorded payment events that are not yet marked PAID (e.g. previously awaiting block confirmations)
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

    // Update ReconciliationCursor
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
      // Conditional update: only update if STILL SENT and STILL 0n paidAmountUsdc and STILL past due
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

      // Write audit log ONLY if count === 1
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
      fromBlock,
      toBlock,
      latestBlock,
      logsFound: logs.length,
      newEventsStored,
      invoicesSettled: affectedInvoiceIds.size,
      expiredInvoicesCount: overdueCount,
      message: "Reconciliation completed successfully",
    };
  };

  let result: ReconcileResult;
  if (!("$transaction" in db) || typeof db.$transaction !== "function") {
    result = await executeReconcile(db as Prisma.TransactionClient);
  } else {
    result = await (db as PrismaClient).$transaction(executeReconcile, {
      maxWait: 15000,
      timeout: 30000,
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
