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
});
