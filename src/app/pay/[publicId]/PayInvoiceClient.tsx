"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount, useSwitchChain, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ERC20_ABI, PAYMENT_ROUTER_ABI } from "@/config/contracts";
import { avalancheFuji } from "viem/chains";
import { Loader2 } from "lucide-react";

interface PublicInvoiceData {
  publicId: string;
  onchainInvoiceId: `0x${string}`;
  title: string;
  notes?: string | null;
  currencyDisplay: string;
  amountUsdc: string;
  paidAmountUsdc: string;
  remainingUsdc: string;
  dueDate: string;
  status: string;
  merchant: {
    displayName: string;
    businessName?: string | null;
    walletAddress: `0x${string}`;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitAmountUsdc: string;
  }>;
  network: {
    chainId: number;
    networkName: string;
    routerAddress: `0x${string}`;
    usdcAddress: `0x${string}`;
    explorerUrl: string;
  };
}

export default function PayInvoiceClient({ publicId }: { publicId: string }) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<PublicInvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lang, setLang] = useState<"en" | "hi">(() => {
    if (typeof window !== "undefined") {
      const l = new URLSearchParams(window.location.search).get("lang");
      if (l === "hi" || l === "en") return l;
    }
    return "en";
  });

  const pendingTxStorageKey = `raseed_pending_tx_${publicId}`;
  const [pendingTxHash, setPendingTxHash] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(`raseed_pending_tx_${publicId}`);
    }
    return null;
  });
  const [reportStatusMessage, setReportStatusMessage] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<"idle" | "approving" | "paying" | "waiting_confirmation" | "confirmed">(() => {
    if (typeof window !== "undefined" && localStorage.getItem(`raseed_pending_tx_${publicId}`)) {
      return "waiting_confirmation";
    }
    return "idle";
  });
  const [txHash, setTxHash] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(`raseed_pending_tx_${publicId}`);
    }
    return null;
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`/api/pay/${publicId}`);
        if (!res.ok) {
          if (!ignore) setNotFound(true);
          return;
        }
        const data = await res.json();
        if (!ignore) {
          setInvoice(data);
          const isPaid =
            data.status === "PAID" ||
            data.status === "PARTIALLY_PAID" ||
            BigInt(data.remainingUsdc) === 0n;

          if (isPaid) {
            if (typeof window !== "undefined") {
              localStorage.removeItem(pendingTxStorageKey);
            }
            setPendingTxHash(null);
            setPaymentStep("confirmed");
            setReportStatusMessage(null);
          }
        }
      } catch {
        if (!ignore) setNotFound(true);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [publicId, pendingTxStorageKey]);

  // Read USDC Balance
  const { data: usdcBalanceRaw, refetch: refetchBalance } = useReadContract({
    address: invoice?.network.usdcAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!invoice },
  });

  // Read USDC Allowance for PaymentRouter
  const { data: allowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: invoice?.network.usdcAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && invoice ? [address, invoice.network.routerAddress] : undefined,
    query: { enabled: !!address && !!invoice },
  });

  const remainingUsdc = invoice ? BigInt(invoice.remainingUsdc) : 0n;
  const userBalance = typeof usdcBalanceRaw === "bigint" ? usdcBalanceRaw : 0n;
  const currentAllowance = typeof allowanceRaw === "bigint" ? allowanceRaw : 0n;

  const isWrongChain = isConnected && chain?.id !== (invoice?.network.chainId || avalancheFuji.id);
  const isCancelledOrExpired = invoice?.status === "CANCELLED" || invoice?.status === "EXPIRED";
  const isDraft = invoice?.status === "DRAFT";
  const isAlreadyPaid = invoice?.status === "PAID" || (remainingUsdc === 0n && invoice !== null && invoice.status !== "DRAFT");
  const hasInsufficientBalance = isConnected && !isWrongChain && userBalance < remainingUsdc;
  const effectivePaymentStep = (pendingTxHash && !isAlreadyPaid) ? "waiting_confirmation" : paymentStep;

  // 3-step indicator derived flags
  const step1Done = isConnected && !isWrongChain;
  const step1Active = !isConnected || isWrongChain;
  const step2Done = step1Done && currentAllowance >= remainingUsdc && remainingUsdc > 0n;
  const step2Active = step1Done && !step2Done;
  const step3Done = isAlreadyPaid || effectivePaymentStep === "confirmed";
  const step3Active = step2Done && !step3Done;

  const formatUsdc = (micro: bigint | string) => {
    const val = typeof micro === "string" ? BigInt(micro) : micro;
    return (Number(val) / 1_000_000).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  };

  const formatAddress = (addr?: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  };

  const clearPendingTx = useCallback((errorMsg?: string) => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(pendingTxStorageKey);
    }
    setPendingTxHash(null);
    setTxHash(null);
    setPaymentStep("idle");
    setReportStatusMessage(null);
    if (errorMsg) {
      setErrorMessage(errorMsg);
    }
  }, [pendingTxStorageKey]);

  // Persistent Polling & Verification Effect
  useEffect(() => {
    const activeTx = txHash || pendingTxHash;
    if (paymentStep !== "waiting_confirmation" || !activeTx) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 36; // 3 minutes at 5s interval

    if (publicClient && activeTx.startsWith("0x")) {
      publicClient
        .waitForTransactionReceipt({ hash: activeTx as `0x${string}`, timeout: 180_000 })
        .then((receipt: { status: string }) => {
          if (receipt.status !== "success" && !cancelled) {
            clearPendingTx(
              lang === "en"
                ? "Payment transaction reverted on-chain. You may try again."
                : "भुगतान लेनदेन ब्लॉकचेन पर विफल (reverted) हो गया। आप पुनः प्रयास कर सकते हैं।"
            );
          }
        })
        .catch((receiptErr: unknown) => {
          console.debug("Receipt tracking error:", receiptErr);
          const msg = (receiptErr instanceof Error ? receiptErr.message : String(receiptErr)).toLowerCase();
          if (msg.includes("revert") && !cancelled) {
            clearPendingTx(
              lang === "en"
                ? "Payment transaction reverted on-chain. You may try again."
                : "भुगतान लेनदेन ब्लॉकचेन पर विफल (reverted) हो गया। आप पुनः प्रयास कर सकते हैं।"
            );
          }
        });
    }

    const checkAndReport = async () => {
      attempts++;
      try {
        const reportRes = await fetch(`/api/pay/${publicId}/report`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicId, txHash: activeTx }),
        });

        if (!reportRes.ok) {
          const errData = await reportRes.json().catch(() => ({}));
          const errMsg = typeof errData.error === "string" ? errData.error : `HTTP ${reportRes.status}`;
          console.debug("Payment report error:", errMsg);

          if (errMsg.toLowerCase().includes("revert") || errMsg.toLowerCase().includes("failed on-chain")) {
            if (!cancelled) {
              clearPendingTx(
                lang === "en"
                  ? "Payment transaction reverted on-chain. You may try again."
                  : "भुगतान लेनदेन ब्लॉकचेन पर विफल (reverted) हो गया। आप पुनः प्रयास कर सकते हैं।"
              );
            }
            return true;
          }

          if (!cancelled) {
            setReportStatusMessage(
              lang === "en"
                ? "Waiting for blockchain confirmations. This can take a minute."
                : "ब्लॉकचेन पुष्टि की प्रतीक्षा की जा रही है। इसमें एक मिनट लग सकता है।"
            );
          }
        } else {
          const reportData = await reportRes.json();
          if (reportData.status === "PAID" || reportData.status === "PARTIALLY_PAID") {
            if (typeof window !== "undefined") {
              localStorage.removeItem(pendingTxStorageKey);
            }
            if (!cancelled) {
              setPendingTxHash(null);
              setPaymentStep("confirmed");
              setReportStatusMessage(null);
              refetchBalance();
              const invRes = await fetch(`/api/pay/${publicId}`);
              if (invRes.ok) setInvoice(await invRes.json());
            }
            return true;
          } else {
            if (!cancelled) {
              setReportStatusMessage(
                lang === "en"
                  ? "Waiting for blockchain confirmations. This can take a minute."
                  : "ब्लॉकचेन पुष्टि की प्रतीक्षा की जा रही है। इसमें एक मिनट लग सकता है।"
              );
            }
          }
        }

        const invRes = await fetch(`/api/pay/${publicId}`);
        if (invRes.ok) {
          const updated = (await invRes.json()) as PublicInvoiceData;
          if (!cancelled) setInvoice(updated);
          if (updated.status === "PAID" || updated.status === "PARTIALLY_PAID") {
            if (typeof window !== "undefined") {
              localStorage.removeItem(pendingTxStorageKey);
            }
            if (!cancelled) {
              setPendingTxHash(null);
              setPaymentStep("confirmed");
              setReportStatusMessage(null);
              refetchBalance();
            }
            return true;
          }
        }
      } catch (networkErr) {
        console.debug("Network polling issue:", networkErr);
        if (!cancelled) {
          setReportStatusMessage(
            lang === "en"
              ? "Waiting for blockchain confirmations. This can take a minute."
              : "ब्लॉकचेन पुष्टि की प्रतीक्षा की जा रही है। इसमें एक मिनट लग सकता है।"
          );
        }
      }

      if (attempts >= maxAttempts && !cancelled) {
        clearPendingTx(
          lang === "en"
            ? "Transaction confirmation timed out or was dropped from the mempool. Pending state cleared; you may check your wallet and try again."
            : "लेनदेन पुष्टि की समय सीमा समाप्त हो गई या mempool से हट गया। लंबित स्थिति हटा दी गई है; आप अपने वॉलेट की जांच कर पुनः प्रयास कर सकते हैं।"
        );
        return true;
      }
      return false;
    };

    checkAndReport();

    const interval = setInterval(async () => {
      const done = await checkAndReport();
      if (done) clearInterval(interval);
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [paymentStep, txHash, pendingTxHash, publicId, pendingTxStorageKey, lang, refetchBalance, clearPendingTx, publicClient]);

  const handlePay = async () => {
    if (!invoice || !address || isDraft || isCancelledOrExpired) return;
    setErrorMessage(null);

    try {
      const neededAmount = remainingUsdc;

      // 1. Approve exact amount if allowance is insufficient
      if (currentAllowance < neededAmount) {
        setPaymentStep("approving");
        const approveTx = await writeContractAsync({
          address: invoice.network.usdcAddress,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [invoice.network.routerAddress, neededAmount], // EXACT amount, never infinite
        });

        if (!publicClient) {
          throw new Error("Blockchain client is unavailable.");
        }

        const approveReceipt = await publicClient.waitForTransactionReceipt({
          hash: approveTx,
        });

        if (approveReceipt.status !== "success") {
          throw new Error(
            lang === "en"
              ? "USDC approval transaction reverted on-chain."
              : "USDC स्वीकृति लेनदेन ब्लॉकचेन पर विफल (reverted) हो गया।"
          );
        }

        await refetchAllowance();
      }

      // 2. Execute PaymentRouter.pay
      setPaymentStep("paying");
      const payTx = await writeContractAsync({
        address: invoice.network.routerAddress,
        abi: PAYMENT_ROUTER_ABI,
        functionName: "pay",
        args: [
          invoice.onchainInvoiceId,
          invoice.merchant.walletAddress,
          neededAmount,
        ],
      });

      setTxHash(payTx);
      setPendingTxHash(payTx);
      if (typeof window !== "undefined") {
        localStorage.setItem(pendingTxStorageKey, payTx);
      }

      // Transition immediately to "Submitted, waiting for confirmations" state
      setPaymentStep("waiting_confirmation");

      // Concurrently monitor tx receipt to detect reverted transactions
      if (publicClient) {
        publicClient
          .waitForTransactionReceipt({ hash: payTx })
          .then((receipt: { status: string }) => {
            if (receipt.status !== "success") {
              clearPendingTx(
                lang === "en"
                  ? "Payment transaction reverted on-chain. You may try again."
                  : "भुगतान लेनदेन ब्लॉकचेन पर विफल (reverted) हो गया। आप पुनः प्रयास कर सकते हैं।"
              );
            }
          })
          .catch((receiptErr: unknown) => {
            console.warn("Receipt tracking error:", receiptErr);
          });
      }
    } catch (err: unknown) {
      console.error("Payment flow failed:", err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("User rejected") || msg.includes("denied")) {
        setErrorMessage(
          lang === "en" ? "Transaction cancelled in wallet." : "वॉलेट में लेनदेन रद्द कर दिया गया।"
        );
      } else {
        setErrorMessage(msg.slice(0, 160));
      }
      setPaymentStep("idle");
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-[480px] mx-auto min-h-screen bg-[#F2F4FB] text-[#161A3A] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#4338CA] animate-spin" />
          <p className="text-xs text-[#5B6190]">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (notFound || !invoice) {
    return (
      <div className="w-full max-w-[480px] mx-auto min-h-screen bg-[#F2F4FB] text-[#161A3A] flex flex-col items-center justify-center p-6 text-center">
        <div style={{ width: 64, height: 64, borderRadius: 20, background: "#FEE2E2", color: "#991B1B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
          404
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#161A3A", marginBottom: 8 }}>
          {lang === "en" ? "Invoice Not Found" : "चालान नहीं मिला"}
        </h1>
        <p style={{ fontSize: 13, color: "#4B517D", marginBottom: 20 }}>
          {lang === "en" ? "The requested payment link is invalid or has been deleted." : "अनुरोधित भुगतान लिंक अमान्य है या हटा दिया गया है।"}
        </p>
        <Link
          href="/"
          style={{ minHeight: 44, padding: "0 20px", display: "inline-flex", alignItems: "center", borderRadius: 16, background: "#4338CA", color: "#FFFFFF", fontWeight: 600, fontSize: 14, textDecoration: "none" }}
        >
          {lang === "en" ? "Return home" : "होम पेज पर लौटें"}
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[480px] mx-auto min-h-screen bg-[#F2F4FB] text-[#161A3A] relative flex flex-col box-border">
      <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "28px 20px 0 20px", flex: 1, paddingBottom: 130 }}>
        {/* Header row: Back button 44px + "Pay invoice" title + Orange testnet pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                window.history.back();
              } else {
                router.push("/");
              }
            }}
            aria-label="Back"
            style={{ width: 44, height: 44, borderRadius: 16, background: "#FFFFFF", boxShadow: "0 2px 8px rgba(40,50,120,0.10)", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", flexShrink: 0 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#161A3A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <div style={{ fontWeight: 700, fontSize: 20, flexGrow: 1, color: "#161A3A" }}>
            {lang === "en" ? "Pay invoice" : "चालान का भुगतान करें"}
          </div>
          <div
            data-testid="pay-testnet-notice"
            style={{ fontSize: 12, fontWeight: 500, padding: "7px 12px", borderRadius: 999, background: "#FFE9D1", color: "#9A4B00", whiteSpace: "nowrap" }}
          >
            {lang === "en" ? "Testnet · no real money" : "टेस्टनेट · वास्तविक धन नहीं"}
          </div>
        </div>

        {/* 3-Step Indicator (Connect / Approve / Pay) */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          {/* Step 1: Connect */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: step1Done ? "#0B6B3A" : step1Active ? "#4338CA" : "#5B6190", fontWeight: step1Done ? 500 : step1Active ? 700 : 500 }}>
            <span style={{ width: 24, height: 24, borderRadius: "50%", background: step1Done ? "#D9F5E6" : step1Active ? "#4338CA" : "transparent", color: step1Active ? "#FFFFFF" : undefined, border: !step1Done && !step1Active ? "1.5px solid #B9BEDD" : "none", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
              {step1Done ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0B6B3A" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12l5 5L20 7" />
                </svg>
              ) : "1"}
            </span>
            {lang === "en" ? "Connect" : "कनेक्ट"}
          </div>

          <div style={{ flexGrow: 1, height: 2, background: step1Done ? "#0B6B3A" : "#D6DAEE" }} />

          {/* Step 2: Approve */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: step2Done ? "#0B6B3A" : step2Active ? "#4338CA" : "#5B6190", fontWeight: step2Done ? 500 : step2Active ? 700 : 500 }}>
            <span style={{ width: 24, height: 24, borderRadius: "50%", background: step2Done ? "#D9F5E6" : step2Active ? "#4338CA" : "transparent", color: step2Active ? "#FFFFFF" : undefined, border: !step2Done && !step2Active ? "1.5px solid #B9BEDD" : "none", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
              {step2Done ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0B6B3A" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12l5 5L20 7" />
                </svg>
              ) : "2"}
            </span>
            {lang === "en" ? "Approve" : "स्वीकृति"}
          </div>

          <div style={{ flexGrow: 1, height: 2, background: step2Done ? "#0B6B3A" : "#D6DAEE" }} />

          {/* Step 3: Pay */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: step3Done ? "#0B6B3A" : step3Active ? "#4338CA" : "#5B6190", fontWeight: step3Done ? 500 : step3Active ? 700 : 500 }}>
            <span style={{ width: 24, height: 24, borderRadius: "50%", background: step3Done ? "#D9F5E6" : step3Active ? "#4338CA" : "transparent", color: step3Active ? "#FFFFFF" : undefined, border: !step3Done && !step3Active ? "1.5px solid #B9BEDD" : "none", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
              {step3Done ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0B6B3A" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12l5 5L20 7" />
                </svg>
              ) : "3"}
            </span>
            {lang === "en" ? "Pay" : "भुगतान"}
          </div>
        </div>

        {/* State Banners: Draft / Expired / Paid / Waiting / Error */}
        {isDraft ? (
          <div data-testid="draft-blocked-notice" style={{ padding: "16px 18px", borderRadius: 20, background: "#FFE9D1", border: "1px solid #FED7AA", color: "#9A4B00", textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              {lang === "en" ? "Invoice Not Yet Issued" : "चालान अभी जारी नहीं किया गया है"}
            </div>
            <p style={{ fontSize: 12, marginTop: 4, lineHeight: 1.4 }}>
              {lang === "en"
                ? "This invoice is in draft status and has not yet been issued by the merchant. Payments cannot be accepted until issued."
                : "यह चालान अभी ड्राफ्ट स्थिति में है और जारी नहीं किया गया है। जारी होने तक भुगतान स्वीकार नहीं किया जा सकता।"}
            </p>
          </div>
        ) : isCancelledOrExpired ? (
          <div style={{ padding: "16px 18px", borderRadius: 20, background: "#FEE2E2", border: "1px solid #FECACA", color: "#991B1B", textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              {lang === "en" ? "Invoice Cancelled or Expired" : "चालान रद्द या समाप्त हो चुका है"}
            </div>
            <p style={{ fontSize: 12, marginTop: 4, lineHeight: 1.4 }}>
              {lang === "en"
                ? "This invoice is no longer active and cannot accept new payments."
                : "यह चालान अब सक्रिय नहीं है और नया भुगतान स्वीकार नहीं कर सकता।"}
            </p>
          </div>
        ) : effectivePaymentStep === "confirmed" || isAlreadyPaid ? (
          <div data-testid="payment-confirmed-notice" style={{ padding: "18px 20px", borderRadius: 20, background: "#D9F5E6", border: "1px solid #A7F3D0", color: "#0B6B3A", textAlign: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#0B6B3A", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px auto" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>
            </div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              {lang === "en" ? "Payment Completed Successfully!" : "भुगतान सफलतापूर्वक संपन्न हुआ!"}
            </div>
            <p style={{ fontSize: 12, marginTop: 3 }}>
              {lang === "en"
                ? "Your transaction has been confirmed on Avalanche Fuji."
                : "आपका लेनदेन Avalanche Fuji पर पुष्ट हो गया है।"}
            </p>
            {txHash && (
              <div style={{ marginTop: 8 }}>
                <a
                  href={`${invoice.network.explorerUrl}/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 12, fontWeight: 700, color: "#0B6B3A", textDecoration: "underline" }}
                >
                  {lang === "en" ? "View on Snowtrace Explorer ↗" : "Snowtrace एक्सप्लोरर पर देखें ↗"}
                </a>
              </div>
            )}
          </div>
        ) : effectivePaymentStep === "waiting_confirmation" ? (
          <div data-testid="payment-waiting-notice" style={{ padding: "18px 20px", borderRadius: 20, background: "#FFE9D1", border: "1px solid #FED7AA", color: "#9A4B00", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div className="animate-spin" style={{ width: 28, height: 28, border: "3px solid #9A4B00", borderTopColor: "transparent", borderRadius: "50%" }} />
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              {lang === "en" ? "Submitted, waiting for confirmations..." : "प्रस्तुत किया गया, पुष्टि की प्रतीक्षा की जा रही है..."}
            </div>
            <div data-testid="report-status-message" style={{ fontSize: 12, lineHeight: 1.4 }}>
              {reportStatusMessage || (lang === "en" ? "Waiting for blockchain confirmations. This can take a minute." : "ब्लॉकचेन पुष्टि की प्रतीक्षा की जा रही है। इसमें एक मिनट लग सकता है।")}
            </div>
            {(txHash || pendingTxHash) && (
              <a
                href={`${invoice.network.explorerUrl}/tx/${txHash || pendingTxHash}`}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 12, fontWeight: 700, color: "#9A4B00", textDecoration: "underline" }}
              >
                {lang === "en" ? "View Transaction on Snowtrace ↗" : "Snowtrace पर लेनदेन देखें ↗"}
              </a>
            )}
            <button
              type="button"
              onClick={() =>
                clearPendingTx(
                  lang === "en"
                    ? "Pending transaction state cleared. You can try paying again."
                    : "लंबित लेनदेन स्थिति हटा दी गई। आप पुनः भुगतान का प्रयास कर सकते हैं।"
                )
              }
              style={{ fontSize: 12, fontWeight: 600, color: "#9A4B00", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", padding: "4px 0", minHeight: 44, display: "inline-flex", alignItems: "center" }}
              data-testid="clear-pending-tx-btn"
            >
              {lang === "en"
                ? "Stuck? Clear pending status to retry"
                : "अटका हुआ है? पुनः प्रयास करने के लिए लंबित स्थिति हटाएं"}
            </button>
          </div>
        ) : null}

        {errorMessage && (
          <div style={{ padding: "12px 14px", borderRadius: 16, background: "#FEE2E2", border: "1px solid #FECACA", color: "#991B1B", fontSize: 13 }}>
            {errorMessage}
          </div>
        )}

        {/* White Payment Card (Radius 28) */}
        <div style={{ padding: "22px 20px", borderRadius: 28, background: "#FFFFFF", boxShadow: "0 10px 28px rgba(40,50,120,0.10)", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 13, color: "#5B6190" }}>
              {lang === "en" ? "Payment to" : "भुगतान प्राप्तकर्ता"}
            </div>
            <div style={{ fontSize: 12, fontWeight: 500, padding: "4px 10px", borderRadius: 999, background: "#FFE9D1", color: "#9A4B00" }}>
              {invoice.status}
            </div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#161A3A" }}>
            {formatAddress(invoice.merchant.walletAddress)}
          </div>
          <div style={{ height: 1, background: "#E6E9F5" }} />
          {invoice.items && invoice.items.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {invoice.items.map((it, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 15 }}>
                  <span style={{ color: "#3A4070" }}>
                    {it.description}{it.quantity > 1 ? ` × ${it.quantity}` : ""}
                  </span>
                  <span style={{ fontWeight: 700, color: "#161A3A" }}>
                    {formatUsdc(BigInt(it.unitAmountUsdc) * BigInt(it.quantity))} USDC
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 15 }}>
              <span style={{ color: "#3A4070" }}>{invoice.title}</span>
              <span style={{ fontWeight: 700, color: "#161A3A" }}>{formatUsdc(invoice.amountUsdc)} USDC</span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, color: "#5B6190" }}>
              {lang === "en" ? "Total due" : "कुल देय राशि"}
            </span>
            <span>
              <span style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-1.5px", color: "#161A3A" }}>
                {formatUsdc(remainingUsdc)}
              </span>{" "}
              <span style={{ fontSize: 16, fontWeight: 500, color: "#4338CA" }}>USDC</span>
            </span>
          </div>
        </div>

        {/* Green Approval Guarantee Box */}
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px", borderRadius: 20, background: "#E3F7EC" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0B6B3A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: "#0F4F2D" }}>
            {lang === "en" ? (
              <>You approve exactly <b>{formatUsdc(remainingUsdc)} USDC</b>, never unlimited. Funds go straight to the merchant.</>
            ) : (
              <>आप केवल सटीक <b>{formatUsdc(remainingUsdc)} USDC</b> स्वीकृत करते हैं, कभी असीमित नहीं। धन सीधे व्यापारी को जाता है।</>
            )}
          </div>
        </div>

        {/* Protocol Verification Note */}
        <div style={{ fontSize: 13, lineHeight: 1.5, color: "#4B517D", padding: "0 4px" }}>
          {lang === "en"
            ? `Routed by PaymentRouter ${formatAddress(invoice.network.routerAddress)}, verified on Snowtrace. It never holds funds. Protocol fee: 0%. Not audited.`
            : `PaymentRouter ${formatAddress(invoice.network.routerAddress)} द्वारा रूट किया गया, Snowtrace पर सत्यापित। यह कभी फंड नहीं रखता। प्रोटोकॉल शुल्क: 0%। ऑडिट नहीं किया गया।`}
        </div>

        {/* Small Muted Legal Links at Bottom of Scroll Area */}
        <div style={{ paddingTop: 20, paddingBottom: 16, textAlign: "center", fontSize: 12, color: "#5B6190", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <Link href="/legal/privacy" style={{ color: "#5B6190", textDecoration: "none" }}>Privacy</Link>
          <span>·</span>
          <Link href="/legal/terms" style={{ color: "#5B6190", textDecoration: "none" }}>Terms</Link>
          <span>·</span>
          <Link href="/security" style={{ color: "#5B6190", textDecoration: "none" }}>Security</Link>
          <span>·</span>
          <Link href="/about/how-it-works" style={{ color: "#5B6190", textDecoration: "none" }}>Docs</Link>
          <span>·</span>
          <button
            type="button"
            onClick={() => setLang(l => (l === "en" ? "hi" : "en"))}
            style={{ color: "#4338CA", background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 12, fontWeight: 600 }}
            aria-label="Toggle language"
          >
            {lang === "en" ? "हिन्दी" : "English"}
          </button>
        </div>
      </div>

      {/* Sticky Bottom Indigo Payment Button (58px) + Chain Info */}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 20, maxWidth: 480, margin: "0 auto", padding: "0 20px", display: "flex", flexDirection: "column", gap: 8, zIndex: 40, pointerEvents: "none" }}>
        <div style={{ pointerEvents: "auto" }}>
          {!isConnected ? (
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <button
                  type="button"
                  onClick={openConnectModal}
                  style={{ width: "100%", minHeight: 58, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 20, background: "#4338CA", color: "#FFFFFF", fontWeight: 700, fontSize: 17, boxShadow: "0 14px 28px rgba(67,56,202,0.30)", border: "none", cursor: "pointer" }}
                >
                  {lang === "en" ? "Connect wallet to pay" : "भुगतान के लिए वॉलेट कनेक्ट करें"}
                </button>
              )}
            </ConnectButton.Custom>
          ) : isWrongChain ? (
            <button
              type="button"
              onClick={() => switchChain({ chainId: avalancheFuji.id })}
              style={{ width: "100%", minHeight: 58, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 20, background: "#4338CA", color: "#FFFFFF", fontWeight: 700, fontSize: 17, boxShadow: "0 14px 28px rgba(67,56,202,0.30)", border: "none", cursor: "pointer" }}
            >
              {lang === "en" ? "Switch to Avalanche Fuji" : "Avalanche Fuji पर स्विच करें"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePay}
              disabled={effectivePaymentStep !== "idle" || !!pendingTxHash}
              style={{
                width: "100%",
                minHeight: 58,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 20,
                background: "#4338CA",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: 17,
                boxShadow: "0 14px 28px rgba(67,56,202,0.30)",
                border: "none",
                cursor: (effectivePaymentStep !== "idle" || !!pendingTxHash) ? "not-allowed" : "pointer",
                opacity: (effectivePaymentStep !== "idle" || !!pendingTxHash) ? 0.55 : 1,
              }}
            >
              {effectivePaymentStep === "approving"
                ? (lang === "en" ? "Approving USDC..." : "स्वीकृत किया जा रहा है...")
                : effectivePaymentStep === "paying"
                ? (lang === "en" ? "Paying on-chain..." : "भुगतान किया जा रहा है...")
                : isAlreadyPaid || effectivePaymentStep === "confirmed"
                ? (lang === "en" ? "Payment completed" : "भुगतान संपन्न")
                : hasInsufficientBalance
                ? (lang === "en" ? "Insufficient USDC balance" : "अपर्याप्त USDC शेष")
                : isDraft
                ? (lang === "en" ? "Invoice not yet issued" : "चालान अभी जारी नहीं हुआ")
                : isCancelledOrExpired
                ? (lang === "en" ? "Invoice inactive" : "चालान निष्क्रिय")
                : (
                  lang === "en"
                    ? `Approve and pay ${formatUsdc(remainingUsdc)} USDC`
                    : `${formatUsdc(remainingUsdc)} USDC स्वीकृत कर भुगतान करें`
                )}
            </button>
          )}
        </div>
        <div style={{ textAlign: "center", fontSize: 12, color: "#5B6190" }}>
          Avalanche Fuji · chain 43113
        </div>
      </div>
    </div>
  );
}
