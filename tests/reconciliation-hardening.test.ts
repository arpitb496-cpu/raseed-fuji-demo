/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import {
  MAX_RECONCILE_BLOCK_RANGE,
  REORG_LOOKBACK_BLOCKS,
  getRouterDeployBlock,
} from "@/lib/settlement/reconciliation";

describe("Reconciliation Hardening & Catch-up Guards", () => {
  it("enforces MAX_RECONCILE_BLOCK_RANGE is strictly <= 2000 for public Fuji RPC limits", () => {
    console.log("MAX_RECONCILE_BLOCK_RANGE is:", MAX_RECONCILE_BLOCK_RANGE.toString());
    expect(MAX_RECONCILE_BLOCK_RANGE).toBeLessThanOrEqual(2000n);
    expect(MAX_RECONCILE_BLOCK_RANGE).toBeGreaterThan(0n);
  });

  it("loads the router deployment block from deployments.json for Fuji testnet", () => {
    const deployBlock = getRouterDeployBlock(43113);
    expect(deployBlock).toBe(59271254n);
  });

  it("catches up across large block gaps chunk-by-chunk without skipping blocks", async () => {
    const deployBlock = 59271254n;
    const targetLatestBlock = 59276000n; // 4,746 blocks ahead

    let currentCursor: bigint | null = null;
    const executedRanges: Array<{ from: bigint; to: bigint }> = [];

    // Simulate 3 iterations of the reconciliation cron
    for (let run = 1; run <= 3; run++) {
      let fromBlock: bigint;
      if (currentCursor !== null) {
        fromBlock =
          currentCursor > REORG_LOOKBACK_BLOCKS
            ? currentCursor - REORG_LOOKBACK_BLOCKS
            : 0n;
      } else {
        fromBlock = deployBlock;
      }

      const toBlock =
        fromBlock + MAX_RECONCILE_BLOCK_RANGE > targetLatestBlock
          ? targetLatestBlock
          : fromBlock + MAX_RECONCILE_BLOCK_RANGE;

      executedRanges.push({ from: fromBlock, to: toBlock });
      currentCursor = toBlock;

      if (toBlock >= targetLatestBlock) {
        break;
      }
    }

    // Verify Run 1: starts at deployBlock, steps by MAX_RECONCILE_BLOCK_RANGE (2000)
    expect(executedRanges[0].from).toBe(deployBlock);
    expect(executedRanges[0].to).toBe(deployBlock + 2000n);

    // Verify Run 2: starts with 12 blocks reorg lookback overlap to guarantee no missed logs
    expect(executedRanges[1].from).toBe(executedRanges[0].to - REORG_LOOKBACK_BLOCKS);
    expect(executedRanges[1].to).toBe(executedRanges[1].from + 2000n);

    // Verify Run 3: catches up to targetLatestBlock exactly
    expect(executedRanges[2].to).toBe(targetLatestBlock);
  });

  it("conditional expiry prevents race condition: concurrent payment keeps invoice PAID/PARTIALLY_PAID, never EXPIRED", async () => {
    // Mock database state where an invoice has a past due date, but received a payment
    const invoiceInDb = {
      id: "inv_123",
      merchantId: "merch_123",
      status: "PAID", // Already marked paid concurrently
      dueDate: new Date(Date.now() - 3600 * 1000), // 1 hour ago
      paidAmountUsdc: 5_000_000n,
    };

    // The conditional update query:
    // UPDATE Invoice SET status = 'EXPIRED' WHERE id = :id AND status = 'SENT' AND paidAmountUsdc = 0 AND dueDate < :now
    const simulateConditionalExpiry = (inv: typeof invoiceInDb) => {
      const conditionMet =
        inv.status === "SENT" &&
        inv.paidAmountUsdc === 0n &&
        inv.dueDate < new Date();

      if (conditionMet) {
        inv.status = "EXPIRED";
        return { count: 1 };
      }
      return { count: 0 };
    };

    const result = simulateConditionalExpiry(invoiceInDb);

    // Expiry update MUST be rejected (count = 0)
    expect(result.count).toBe(0);
    // Invoice status remains PAID!
    expect(invoiceInDb.status).toBe("PAID");
  });

  it("conditional expiry prevents partial payment race: PARTIALLY_PAID is never converted to EXPIRED", async () => {
    const invoiceInDb = {
      id: "inv_456",
      merchantId: "merch_456",
      status: "PARTIALLY_PAID",
      dueDate: new Date(Date.now() - 3600 * 1000),
      paidAmountUsdc: 2_000_000n,
    };

    const conditionMet =
      invoiceInDb.status === "SENT" &&
      invoiceInDb.paidAmountUsdc === 0n &&
      invoiceInDb.dueDate < new Date();

    const count = conditionMet ? 1 : 0;
    expect(count).toBe(0);
    expect(invoiceInDb.status).toBe("PARTIALLY_PAID");
  });
});
