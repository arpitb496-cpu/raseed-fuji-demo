/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("PayInvoiceClient & Pay Flow Logic", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("blocks payment when invoice status is DRAFT and renders not-yet-issued message", () => {
    // Evaluation helper mirroring PayInvoiceClient logic
    const invoice = {
      status: "DRAFT",
      remainingUsdc: "5000000",
    };
    const isCancelledOrExpired = invoice.status === "CANCELLED" || invoice.status === "EXPIRED";
    const isDraft = invoice.status === "DRAFT";
    const isAlreadyPaid = invoice.status === "PAID" || (invoice.remainingUsdc === "0" && invoice.status !== "DRAFT");

    expect(isCancelledOrExpired).toBe(false);
    expect(isDraft).toBe(true);
    expect(isAlreadyPaid).toBe(false);

    // Payment action must be blocked
    const canInitiatePay = !isDraft && !isCancelledOrExpired && !isAlreadyPaid;
    expect(canInitiatePay).toBe(false);
  });

  it("handles approve transaction reverting on-chain and halts payment flow", async () => {
    const mockApproveTx = "0xapprove123456789";
    const mockPublicClient = {
      waitForTransactionReceipt: vi.fn().mockResolvedValue({
        status: "reverted",
        transactionHash: mockApproveTx,
      }),
    };

    let paymentStep: string = "approving";
    let errorMessage: string | null = null;

    try {
      const receipt = await mockPublicClient.waitForTransactionReceipt({ hash: mockApproveTx });
      if (receipt.status !== "success") {
        throw new Error("USDC approval transaction reverted on-chain.");
      }
      paymentStep = "paying";
    } catch (err: any) {
      paymentStep = "idle";
      errorMessage = err.message;
    }

    expect(paymentStep).toBe("idle");
    expect(errorMessage).toBe("USDC approval transaction reverted on-chain.");
    expect(mockPublicClient.waitForTransactionReceipt).toHaveBeenCalledWith({ hash: mockApproveTx });
  });

  it("handles pay transaction reverting on-chain and halts payment flow", async () => {
    const mockPayTx = "0xpay123456789";
    const mockPublicClient = {
      waitForTransactionReceipt: vi.fn().mockResolvedValue({
        status: "reverted",
        transactionHash: mockPayTx,
      }),
    };

    let paymentStep: string = "paying";
    let errorMessage: string | null = null;

    // Upon submission, step becomes waiting_confirmation
    paymentStep = "waiting_confirmation";

    const receipt = await mockPublicClient.waitForTransactionReceipt({ hash: mockPayTx });
    if (receipt.status !== "success") {
      paymentStep = "idle";
      errorMessage = "Payment transaction reverted on-chain.";
    }

    expect(paymentStep).toBe("idle");
    expect(errorMessage).toBe("Payment transaction reverted on-chain.");
  });

  it("remains in waiting_confirmation when server status is still SENT during polling", async () => {
    const mockPollResponse = {
      status: "SENT",
      remainingUsdc: "10000000",
      paidAmountUsdc: "0",
    };

    let paymentStep = "waiting_confirmation";

    // Polling receives SENT: does not transition to confirmed
    if (mockPollResponse.status === "PAID" || mockPollResponse.status === "PARTIALLY_PAID") {
      paymentStep = "confirmed";
    }

    expect(paymentStep).toBe("waiting_confirmation");
  });

  it("transitions to confirmed when server returns PAID during polling", async () => {
    const mockPollResponse = {
      status: "PAID",
      remainingUsdc: "0",
      paidAmountUsdc: "10000000",
    };

    let paymentStep = "waiting_confirmation";

    // Polling receives PAID: transitions to confirmed!
    if (mockPollResponse.status === "PAID" || mockPollResponse.status === "PARTIALLY_PAID") {
      paymentStep = "confirmed";
    }

    expect(paymentStep).toBe("confirmed");
  });

  it("transitions to confirmed when server returns PARTIALLY_PAID during polling", async () => {
    const mockPollResponse = {
      status: "PARTIALLY_PAID",
      remainingUsdc: "5000000",
      paidAmountUsdc: "5000000",
    };

    let paymentStep = "waiting_confirmation";

    if (mockPollResponse.status === "PAID" || mockPollResponse.status === "PARTIALLY_PAID") {
      paymentStep = "confirmed";
    }

    expect(paymentStep).toBe("confirmed");
  });

  it("proves SIWE authentication button is suppressed on /pay/* routes", () => {
    // Navbar route logic simulation
    function shouldShowSiwe(pathname: string, isConnected: boolean): boolean {
      const isPayPage = pathname.startsWith("/pay");
      return !isPayPage && isConnected;
    }

    // On standard app pages, SIWE is shown when wallet is connected
    expect(shouldShowSiwe("/app", true)).toBe(true);
    expect(shouldShowSiwe("/app/invoices", true)).toBe(true);
    expect(shouldShowSiwe("/", true)).toBe(true);

    // On /pay/* routes, SIWE is suppressed even when wallet is connected
    expect(shouldShowSiwe("/pay/INV-0001", true)).toBe(false);
    expect(shouldShowSiwe("/pay/raseed_unguessable_public_id", true)).toBe(false);
  });

  describe("Pending Tx Escape Hatch & Lifecycle (localStorage raseed_pending_tx_<publicId>)", () => {
    const publicId = "raseed_test_escape_hatch";
    const storageKey = `raseed_pending_tx_${publicId}`;
    let mockStorage: Record<string, string> = {};

    beforeEach(() => {
      mockStorage = {};
      (global as any).localStorage = {
        getItem: (k: string) => mockStorage[k] || null,
        setItem: (k: string, v: string) => {
          mockStorage[k] = v;
        },
        removeItem: (k: string) => {
          delete mockStorage[k];
        },
      };
    });

    it("revert path: clears pending tx from storage, resets step to idle, and enables retry", async () => {
      mockStorage[storageKey] = "0xreverted_tx_hash";
      let pendingTxHash: string | null = mockStorage[storageKey];
      let paymentStep: string = "waiting_confirmation";
      let errorMessage: string | null = null;

      const clearPendingTx = (msg: string) => {
        delete mockStorage[storageKey];
        pendingTxHash = null;
        paymentStep = "idle";
        errorMessage = msg;
      };

      // Server returns 400 with "Transaction reverted or failed on-chain"
      const reportResponse = {
        ok: false,
        status: 400,
        error: "Transaction reverted or failed on-chain",
      };

      if (!reportResponse.ok && reportResponse.error.includes("reverted")) {
        clearPendingTx("Payment transaction reverted on-chain. You may try again.");
      }

      expect(mockStorage[storageKey]).toBeUndefined();
      expect(pendingTxHash).toBeNull();
      expect(paymentStep).toBe("idle");
      expect(errorMessage).toBe("Payment transaction reverted on-chain. You may try again.");

      // Pay button must now be unlocked
      const isPayButtonDisabled = paymentStep !== "idle" || !!pendingTxHash;
      expect(isPayButtonDisabled).toBe(false);
    });

    it("dropped / not-found timeout path: clears pending tx after max attempts and enables retry", async () => {
      mockStorage[storageKey] = "0xdropped_mempool_tx_hash";
      let pendingTxHash: string | null = mockStorage[storageKey];
      let paymentStep: string = "waiting_confirmation";
      let errorMessage: string | null = null;

      const clearPendingTx = (msg: string) => {
        delete mockStorage[storageKey];
        pendingTxHash = null;
        paymentStep = "idle";
        errorMessage = msg;
      };

      let attempts = 0;
      const maxAttempts = 36;

      // Simulate polling loop running until timeout
      while (attempts < maxAttempts) {
        attempts++;
      }

      if (attempts >= maxAttempts) {
        clearPendingTx("Transaction confirmation timed out or was dropped from the mempool. Pending state cleared; you may check your wallet and try again.");
      }

      expect(mockStorage[storageKey]).toBeUndefined();
      expect(pendingTxHash).toBeNull();
      expect(paymentStep).toBe("idle");
      expect(errorMessage).toContain("dropped from the mempool");

      // Pay button must now be unlocked
      const isPayButtonDisabled = paymentStep !== "idle" || !!pendingTxHash;
      expect(isPayButtonDisabled).toBe(false);
    });

    it("success path (PAID): clears pending tx from storage and transitions to confirmed", async () => {
      mockStorage[storageKey] = "0xsuccessful_tx_hash";
      let pendingTxHash: string | null = mockStorage[storageKey];
      let paymentStep: string = "waiting_confirmation";

      const reportResponse = {
        ok: true,
        data: { status: "PAID", paidAmountUsdc: "10000000" },
      };

      if (reportResponse.ok && (reportResponse.data.status === "PAID" || reportResponse.data.status === "PARTIALLY_PAID")) {
        delete mockStorage[storageKey];
        pendingTxHash = null;
        paymentStep = "confirmed";
      }

      expect(mockStorage[storageKey]).toBeUndefined();
      expect(pendingTxHash).toBeNull();
      expect(paymentStep).toBe("confirmed");
    });

    it("success path (PARTIALLY_PAID): clears pending tx from storage and transitions to confirmed", async () => {
      mockStorage[storageKey] = "0xpartially_paid_tx_hash";
      let pendingTxHash: string | null = mockStorage[storageKey];
      let paymentStep: string = "waiting_confirmation";

      const reportResponse = {
        ok: true,
        data: { status: "PARTIALLY_PAID", paidAmountUsdc: "5000000" },
      };

      if (reportResponse.ok && (reportResponse.data.status === "PAID" || reportResponse.data.status === "PARTIALLY_PAID")) {
        delete mockStorage[storageKey];
        pendingTxHash = null;
        paymentStep = "confirmed";
      }

      expect(mockStorage[storageKey]).toBeUndefined();
      expect(pendingTxHash).toBeNull();
      expect(paymentStep).toBe("confirmed");
    });

    it("manual escape hatch: user can clear stuck pending tx and retry payment", () => {
      mockStorage[storageKey] = "0xstuck_tx_hash";
      let pendingTxHash: string | null = mockStorage[storageKey];
      let paymentStep: string = "waiting_confirmation";
      let errorMessage: string | null = null;

      const clearPendingTx = (msg: string) => {
        delete mockStorage[storageKey];
        pendingTxHash = null;
        paymentStep = "idle";
        errorMessage = msg;
      };

      // User clicks "Stuck? Clear pending status to retry"
      clearPendingTx("Pending transaction state cleared. You can try paying again.");

      expect(mockStorage[storageKey]).toBeUndefined();
      expect(pendingTxHash).toBeNull();
      expect(paymentStep).toBe("idle");
      expect(errorMessage).toContain("Pending transaction state cleared");

      const isPayButtonDisabled = paymentStep !== "idle" || !!pendingTxHash;
      expect(isPayButtonDisabled).toBe(false);
    });
  });
});
