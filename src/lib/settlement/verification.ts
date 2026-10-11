import { prisma } from "@/lib/db";
import { getServerPublicClient } from "@/lib/blockchain/client";
import { CURRENT_NETWORK } from "@/config/network";
import { recomputeInvoiceSettlement, type SettlementResult } from "./settlement-engine";
import { decodeEventLog, type PublicClient } from "viem";

export const PAID_EVENT_ABI = {
  type: "event",
  name: "Paid",
  inputs: [
    { name: "invoiceId", type: "bytes32", indexed: true },
    { name: "payer", type: "address", indexed: true },
    { name: "merchant", type: "address", indexed: true },
    { name: "amount", type: "uint256", indexed: false },
    { name: "fee", type: "uint256", indexed: false },
  ],
} as const;

import type { PrismaClient, Prisma } from "@prisma/client";

export interface VerifyPaymentResult {
  success: boolean;
  error?: string;
  statusCode?: number;
  invoiceId?: string;
  settlement?: SettlementResult;
  recordedEvents?: number;
}

export async function verifyAndRecordPayment(
  params: {
    publicId: string;
    txHash: `0x${string}`;
    expectedRouterAddress?: string;
    publicClient?: PublicClient;
    prismaClient?: PrismaClient | Prisma.TransactionClient;
  }
): Promise<VerifyPaymentResult> {
  const { publicId, txHash } = params;
  const db = (params.prismaClient || prisma) as PrismaClient;

  // 1. Look up invoice
  const invoice = await db.invoice.findUnique({
    where: { publicId },
    include: { merchant: true },
  });

  if (!invoice) {
    return {
      success: false,
      error: "Invoice not found",
      statusCode: 404,
    };
  }

  const client = params.publicClient || getServerPublicClient();
  const rawRouter = params.expectedRouterAddress || CURRENT_NETWORK.routerAddress;
  if (!rawRouter) {
    return {
      success: false,
      error: "Router address is not configured for active network",
      statusCode: 500,
    };
  }
  const configuredRouter = rawRouter.toLowerCase();

  // 2. Fetch receipt from RPC
  let receipt;
  try {
    receipt = await client.getTransactionReceipt({ hash: txHash });
  } catch (err) {
    // CRITICAL: RPC errors must not mark anything failed
    return {
      success: false,
      error: `RPC communication error: ${err instanceof Error ? err.message : String(err)}`,
      statusCode: 503,
    };
  }

  if (!receipt) {
    return {
      success: false,
      error: "Transaction receipt not yet available",
      statusCode: 404,
    };
  }

  // 3. Require success
  if (receipt.status !== "success") {
    return {
      success: false,
      error: "Transaction reverted or failed on-chain",
      statusCode: 400,
    };
  }

  // 4. Decode Paid logs ONLY from configured router address
  let matchingLogsCount = 0;
  const chainId = CURRENT_NETWORK.chain.id;

  for (const log of receipt.logs) {
    // Strictly ignore logs from other addresses
    if (log.address.toLowerCase() !== configuredRouter) {
      continue;
    }

    try {
      const decoded = decodeEventLog({
        abi: [PAID_EVENT_ABI],
        data: log.data,
        topics: log.topics,
      });

      if (decoded.eventName !== "Paid") continue;

      const args = decoded.args as {
        invoiceId: `0x${string}`;
        payer: `0x${string}`;
        merchant: `0x${string}`;
        amount: bigint;
        fee: bigint;
      };

      // Require onchainInvoiceId and merchant to match the invoice exactly
      const logInvoiceId = args.invoiceId.toLowerCase();
      const expectedInvoiceId = invoice.onchainInvoiceId.toLowerCase();
      const logMerchant = args.merchant.toLowerCase();
      const expectedMerchant = invoice.merchant.walletAddress.toLowerCase();

      if (logInvoiceId !== expectedInvoiceId || logMerchant !== expectedMerchant) {
        continue;
      }

      // 5. Idempotent insert on unique (chainId, txHash, logIndex)
      await db.paymentEvent.upsert({
        where: {
          chainId_txHash_logIndex: {
            chainId,
            txHash: receipt.transactionHash.toLowerCase(),
            logIndex: log.logIndex,
          },
        },
        update: {
          invalidatedAt: null,
          invalidReason: null,
          blockHash: receipt.blockHash.toLowerCase(),
          blockNumber: receipt.blockNumber,
        },
        create: {
          invoiceId: invoice.id,
          txHash: receipt.transactionHash.toLowerCase(),
          logIndex: log.logIndex,
          blockHash: receipt.blockHash.toLowerCase(),
          blockNumber: receipt.blockNumber,
          chainId,
          routerAddress: log.address.toLowerCase(),
          merchantAddress: logMerchant,
          payerAddress: args.payer.toLowerCase(),
          onchainInvoiceId: logInvoiceId,
          amountUsdc: BigInt(args.amount),
          feeUsdc: BigInt(args.fee),
        },
      });

      matchingLogsCount++;
    } catch {
      // Non-Paid log on router: ignore
      continue;
    }
  }

  if (matchingLogsCount === 0) {
    return {
      success: false,
      error: "No matching Paid event log found from configured router for this invoice",
      statusCode: 400,
    };
  }

  // 6. Trigger settlement engine recomputation with row lock
  const settlement = await recomputeInvoiceSettlement(invoice.id, {
    publicClient: client,
    prismaClient: db,
  });

  return {
    success: true,
    invoiceId: invoice.id,
    settlement,
    recordedEvents: matchingLogsCount,
  };
}
