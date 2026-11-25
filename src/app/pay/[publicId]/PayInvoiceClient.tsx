"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount, useSwitchChain, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ERC20_ABI, PAYMENT_ROUTER_ABI } from "@/config/contracts";
import { avalancheFuji } from "viem/chains";
import { Loader2 } from "lucide-react";
import { isConfiguredAddress } from "@/config/network";

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
    routerAddress: `0x${string}` | null;
    routerConfigured?: boolean;
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
    args: address && invoice?.network.routerAddress ? [address, invoice.network.routerAddress] : undefined,
    query: { enabled: !!address && !!invoice?.network.routerAddress },
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

  const isPaid = isAlreadyPaid || invoice?.status === "PAID" || effectivePaymentStep === "confirmed";
  const isCancelled = invoice?.status === "CANCELLED";
  const isExpired = invoice?.status === "EXPIRED" || (isCancelledOrExpired && !isCancelled);
  const isTerminalOrDraft = isPaid || isCancelled || isExpired || isDraft;

  const statusChipStyle = isPaid
    ? { background: "#a4d4c5", color: "#0a0a0a" }
    : (isCancelledOrExpired || isCancelled || isExpired)
    ? { background: "#fee2e2", color: "#991b1b" }
    : { background: "#ffb084", color: "#0a0a0a" };

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

  useEffect(() => {
    const activeTx = txHash || pendingTxHash;
    if (paymentStep !== "waiting_confirmation" || !activeTx) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 36;

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
                ? "Payment sent. We are still confirming it, please keep this page open."
                : "भुगतान भेज दिया गया है। हम अभी भी इसकी पुष्टि कर रहे हैं, कृपया इस पेज को खुला रखें।"
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
    if (!isConfiguredAddress(invoice?.network?.routerAddress)) {
      setErrorMessage(
        lang === "en"
          ? "Contract address not configured in this environment. Payment is disabled."
          : "इस परिवेश में अनुबंध पता कॉन्फ़िगर नहीं है। भुगतान अक्षम है।"
      );
      return;
    }
    setErrorMessage(null);

    try {
      const neededAmount = remainingUsdc;

      if (currentAllowance < neededAmount) {
        setPaymentStep("approving");
        const approveTx = await writeContractAsync({
          address: invoice.network.usdcAddress,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [invoice.network.routerAddress, neededAmount],
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

      setPaymentStep("waiting_confirmation");

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
      <div className="w-full min-h-screen bg-[#fffaf0] text-[#0a0a0a] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 text-[#0a0a0a] animate-spin" />
          <p className="text-xs text-[#6a6a6a]">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (notFound || !invoice) {
    return (
      <div className="w-full min-h-screen bg-[#fffaf0] text-[#0a0a0a] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-md bg-[#faf5e8] border border-[#0a0a0a] rounded-[24px] p-8 flex flex-col items-center">
          <div className="w-16 h-16 rounded-[18px] bg-[#fee2e2] text-[#991b1b] flex items-center justify-center text-2xl font-medium mb-4">
            404
          </div>
          <h1 className="text-2xl font-display font-medium text-[#0a0a0a] mb-2">
            {lang === "en" ? "Invoice Not Found" : "चालान नहीं मिला"}
          </h1>
          <p className="text-sm text-[#3a3a3a] mb-6">
            {lang === "en"
              ? "The requested payment link is invalid or has been deleted."
              : "अनुरोधित भुगतान लिंक अमान्य है या हटा दिया गया है।"}
          </p>
          <Link href="/" className="clay-btn-primary">
            {lang === "en" ? "Return home" : "होम पेज पर लौटें"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#fffaf0] text-[#0a0a0a] relative flex flex-col box-border">
      <div
        className="w-full max-w-[520px] mx-auto flex-1 flex flex-col gap-4 px-5 pt-7"
        style={{ paddingBottom: isTerminalOrDraft ? 36 : 136 }}
      >
        {/* Header Row */}
        <div className="flex items-center gap-2.5">
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
            className="w-11 h-11 rounded-[14px] bg-[#faf5e8] border border-[#e5e5e5] hover:border-[#0a0a0a] flex items-center justify-center cursor-pointer shrink-0 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <div className="font-display font-medium text-xl flex-1 text-[#0a0a0a]">
            {lang === "en" ? "Pay invoice" : "चालान का भुगतान करें"}
          </div>
          <div
            data-testid="pay-testnet-notice"
            className="text-xs font-medium px-3 py-1.5 rounded-full bg-[#ffb084] text-[#0a0a0a] border border-[#0a0a0a]/10 whitespace-nowrap"
          >
            {lang === "en" ? "Testnet · no real money" : "टेस्टनेट · वास्तविक धन नहीं"}
          </div>
        </div>

        {/* 3-Step Indicator */}
        {!isTerminalOrDraft && (
          <div className="flex items-center gap-2 text-xs py-1">
            <div
              className="flex items-center gap-1.5"
              style={{
                color: step1Done ? "#173f32" : step1Active ? "#0a0a0a" : "#6a6a6a",
                fontWeight: step1Active ? 600 : 500,
              }}
            >
              <span
                className="w-6 h-6 rounded-full inline-flex items-center justify-center text-xs"
                style={{
                  background: step1Done ? "#a4d4c5" : step1Active ? "#0a0a0a" : "transparent",
                  color: step1Active ? "#fffaf0" : "#0a0a0a",
                  border: !step1Done && !step1Active ? "1px solid #9a9a9a" : "none",
                }}
              >
                {step1Done ? "✓" : "1"}
              </span>
              {lang === "en" ? "Connect" : "कनेक्ट"}
            </div>

            <div className="flex-1 h-[1.5px]" style={{ background: step1Done ? "#173f32" : "#e5e5e5" }} />

            <div
              className="flex items-center gap-1.5"
              style={{
                color: step2Done ? "#173f32" : step2Active ? "#0a0a0a" : "#6a6a6a",
                fontWeight: step2Active ? 600 : 500,
              }}
            >
              <span
                className="w-6 h-6 rounded-full inline-flex items-center justify-center text-xs"
                style={{
                  background: step2Done ? "#a4d4c5" : step2Active ? "#0a0a0a" : "transparent",
                  color: step2Active ? "#fffaf0" : "#0a0a0a",
                  border: !step2Done && !step2Active ? "1px solid #9a9a9a" : "none",
                }}
              >
                {step2Done ? "✓" : "2"}
              </span>
              {lang === "en" ? "Approve" : "स्वीकृति"}
            </div>

            <div className="flex-1 h-[1.5px]" style={{ background: step2Done ? "#173f32" : "#e5e5e5" }} />

            <div
              className="flex items-center gap-1.5"
              style={{
                color: step3Done ? "#173f32" : step3Active ? "#0a0a0a" : "#6a6a6a",
                fontWeight: step3Active ? 600 : 500,
              }}
            >
              <span
                className="w-6 h-6 rounded-full inline-flex items-center justify-center text-xs"
                style={{
                  background: step3Done ? "#a4d4c5" : step3Active ? "#0a0a0a" : "transparent",
                  color: step3Active ? "#fffaf0" : "#0a0a0a",
                  border: !step3Done && !step3Active ? "1px solid #9a9a9a" : "none",
                }}
              >
                {step3Done ? "✓" : "3"}
              </span>
              {lang === "en" ? "Pay" : "भुगतान"}
            </div>
          </div>
        )}

        {/* State Banners */}
        {isPaid ? (
          <div
            data-testid="payment-confirmed-notice"
            className="p-6 rounded-[22px] bg-[#1a3a3a] text-[#fffaf0] text-center flex flex-col items-center gap-2.5"
          >
            <div className="w-11 h-11 rounded-full bg-[#a4d4c5] text-[#0a0a0a] flex items-center justify-center font-bold">
              ✓
            </div>
            <div className="font-display font-medium text-lg text-white">
              {lang === "en" ? "This invoice has been paid" : "इस चालान का भुगतान हो चुका है"}
            </div>
            <p className="text-xs text-[#f0f0f0] m-0">
              {lang === "en"
                ? "Payment has been confirmed on Avalanche Fuji."
                : "Avalanche Fuji पर भुगतान की पुष्टि हो चुकी है।"}
            </p>
            {txHash ? (
              <a
                href={`${invoice.network.explorerUrl}/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-[#a4d4c5] underline mt-1"
              >
                {lang === "en" ? "View Transaction on Snowtrace ↗" : "Snowtrace पर लेनदेन देखें ↗"}
              </a>
            ) : isConfiguredAddress(invoice.network?.routerAddress) ? (
              <a
                href={`${invoice.network.explorerUrl}/address/${invoice.network.routerAddress}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-[#a4d4c5] underline mt-1"
              >
                {lang === "en" ? "View PaymentRouter on Snowtrace ↗" : "Snowtrace पर PaymentRouter देखें ↗"}
              </a>
            ) : null}
          </div>
        ) : isCancelledOrExpired ? (
          <div className="p-6 rounded-[22px] bg-[#fee2e2] border border-[#fecaca] text-[#991b1b] text-center flex flex-col items-center gap-2">
            <div className="w-11 h-11 rounded-full bg-[#991b1b] text-white flex items-center justify-center text-lg font-bold">
              ✕
            </div>
            <div className="font-display font-medium text-lg">
              {isCancelled
                ? (lang === "en" ? "This invoice has been cancelled" : "यह चालान रद्द कर दिया गया है")
                : (lang === "en" ? "This invoice has expired" : "यह चालान समाप्त हो चुका है")}
            </div>
            <p className="text-xs m-0">
              {lang === "en"
                ? "This invoice is no longer active and cannot accept new payments."
                : "यह चालान अब सक्रिय नहीं है और नया भुगतान स्वीकार नहीं कर सकता।"}
            </p>
          </div>
        ) : isDraft ? (
          <div
            data-testid="draft-blocked-notice"
            className="p-5 rounded-[22px] bg-[#ffb084] border border-[#0a0a0a]/15 text-[#0a0a0a] text-center flex flex-col items-center gap-2"
          >
            <div className="w-10 h-10 rounded-full bg-[#0a0a0a] text-[#fffaf0] flex items-center justify-center text-base font-bold">
              !
            </div>
            <div className="font-display font-medium text-base">
              {lang === "en" ? "Invoice Not Yet Issued" : "चालान अभी जारी नहीं किया गया है"}
            </div>
            <p className="text-xs m-0 text-[#1a1a1a]">
              {lang === "en"
                ? "This invoice is in draft status and has not yet been issued by the merchant. Payments cannot be accepted until issued."
                : "यह चालान अभी ड्राफ्ट स्थिति में है और जारी नहीं किया गया है। जारी होने तक भुगतान स्वीकार नहीं किया जा सकता।"}
            </p>
          </div>
        ) : effectivePaymentStep === "waiting_confirmation" ? (
          <div
            data-testid="payment-waiting-notice"
            className="p-5 rounded-[20px] bg-[#f5f0e0] border border-[#0a0a0a] text-[#0a0a0a] text-center flex flex-col items-center gap-2"
          >
            <div className="animate-spin w-7 h-7 border-[3px] border-[#0a0a0a] border-t-transparent rounded-full" />
            <div className="font-medium text-sm">
              {lang === "en" ? "Submitted, waiting for confirmations..." : "प्रस्तुत किया गया, पुष्टि की प्रतीक्षा की जा रही है..."}
            </div>
            <div data-testid="report-status-message" className="text-xs text-[#3a3a3a]">
              {reportStatusMessage || (lang === "en" ? "Waiting for blockchain confirmations. This can take a minute." : "ब्लॉकचेन पुष्टि की प्रतीक्षा की जा रही है। इसमें एक मिनट लग सकता है।")}
            </div>
            {(txHash || pendingTxHash) && (
              <a
                href={`${invoice.network.explorerUrl}/tx/${txHash || pendingTxHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-[#0a0a0a] underline"
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
              className="text-xs font-medium text-[#b64d31] underline bg-transparent border-0 cursor-pointer min-h-[44px]"
              data-testid="clear-pending-tx-btn"
            >
              {lang === "en"
                ? "Stuck? Clear pending status to retry"
                : "अटका हुआ है? पुनः प्रयास करने के लिए लंबित स्थिति हटाएं"}
            </button>
          </div>
        ) : null}

        {errorMessage && (
          <div className="p-3.5 rounded-[14px] bg-[#fee2e2] border border-[#fecaca] text-[#991b1b] text-xs">
            {errorMessage}
          </div>
        )}

        {/* Payment Card */}
        <div className="p-6 rounded-[24px] bg-[#faf5e8] border border-[#0a0a0a] flex flex-col gap-3.5">
          <div className="flex justify-between items-center">
            <div className="nyc-kicker">
              {lang === "en" ? "Payment to" : "भुगतान प्राप्तकर्ता"}
            </div>
            <div
              className="text-xs font-medium px-3 py-1 rounded-[9px]"
              style={statusChipStyle}
            >
              {invoice.status}
            </div>
          </div>
          <div className="text-lg font-mono font-medium text-[#0a0a0a]">
            {formatAddress(invoice.merchant.walletAddress)}
          </div>
          <div className="h-[1px] bg-[#e5e5e5]" />
          {invoice.items && invoice.items.length > 0 ? (
            <div className="flex flex-col gap-2">
              {invoice.items.map((it, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <span className="text-[#3a3a3a]">
                    {it.description}{it.quantity > 1 ? ` × ${it.quantity}` : ""}
                  </span>
                  <span className="font-mono font-medium text-[#0a0a0a]">
                    {formatUsdc(BigInt(it.unitAmountUsdc) * BigInt(it.quantity))} USDC
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#3a3a3a]">{invoice.title}</span>
              <span className="font-mono font-medium text-[#0a0a0a]">
                {formatUsdc(invoice.amountUsdc)} USDC
              </span>
            </div>
          )}
          <div className="flex items-baseline justify-between pt-3 border-t border-[#e5e5e5]">
            <span className="text-sm text-[#3a3a3a]">
              {isPaid
                ? (lang === "en" ? "Total paid" : "कुल भुगतान")
                : (lang === "en" ? "Total due" : "कुल देय राशि")}
            </span>
            <span>
              <span className="text-4xl font-light font-mono tabular-nums tracking-[-0.04em] text-[#0a0a0a]">
                {isPaid ? formatUsdc(invoice.amountUsdc) : formatUsdc(remainingUsdc)}
              </span>{" "}
              <span className="text-sm font-medium text-[#b64d31]">USDC</span>
            </span>
          </div>
        </div>

        {/* Mint Approval Box */}
        {!isTerminalOrDraft && (
          <div className="flex gap-3 items-start p-4 rounded-[18px] bg-[#a4d4c5]/45 border border-[#173f32]/20">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#173f32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 mt-0.5">
              <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            <div className="text-xs leading-relaxed text-[#173f32]">
              {lang === "en" ? (
                <>You approve exactly <b>{formatUsdc(remainingUsdc)} USDC</b>, never unlimited. Funds go straight to the merchant.</>
              ) : (
                <>आप केवल सटीक <b>{formatUsdc(remainingUsdc)} USDC</b> स्वीकृत करते हैं, कभी असीमित नहीं। धन सीधे व्यापारी को जाता है।</>
              )}
            </div>
          </div>
        )}

        {/* Protocol Verification Note */}
        <div className="text-xs leading-relaxed text-[#6a6a6a] px-1">
          {isConfiguredAddress(invoice.network?.routerAddress) ? (
            lang === "en"
              ? `Routed by PaymentRouter ${formatAddress(invoice.network.routerAddress)}. Source code published on Snowtrace (similar-match verification). It never holds funds. Protocol fee: 0%. Not audited.`
              : `PaymentRouter ${formatAddress(invoice.network.routerAddress)} द्वारा रूट किया गया। Snowtrace पर स्रोत कोड प्रकाशित (समान-मिलान सत्यापन)। यह कभी फंड नहीं रखता। प्रोटोकॉल शुल्क: 0%। ऑडिट नहीं किया गया।`
          ) : (
            lang === "en"
              ? "Contract address not configured in this environment."
              : "इस परिवेश में अनुबंध पता कॉन्फ़िगर नहीं है।"
          )}
        </div>

        {/* Bottom Legal & Language Links */}
        <div className="py-4 text-center text-xs text-[#6a6a6a] flex items-center justify-center gap-2.5">
          <Link href="/legal/privacy" className="hover:text-[#0a0a0a] hover:underline">Privacy</Link>
          <span>·</span>
          <Link href="/legal/terms" className="hover:text-[#0a0a0a] hover:underline">Terms</Link>
          <span>·</span>
          <Link href="/security" className="hover:text-[#0a0a0a] hover:underline">Security</Link>
          <span>·</span>
          <Link href="/about/how-it-works" className="hover:text-[#0a0a0a] hover:underline">Docs</Link>
          <span>·</span>
          <button
            type="button"
            onClick={() => setLang(l => (l === "en" ? "hi" : "en"))}
            className="text-[#0a0a0a] font-medium underline bg-transparent border-0 cursor-pointer p-0 text-xs"
            aria-label="Toggle language"
          >
            {lang === "en" ? "हिन्दी" : "English"}
          </button>
        </div>
      </div>

      {/* Sticky Bottom Black Payment Button */}
      {!isTerminalOrDraft && (
        <div className="fixed left-0 right-0 bottom-5 max-w-[520px] mx-auto px-5 flex flex-col gap-2 z-40 pointer-events-none">
          <div className="pointer-events-auto">
            {!isConnected ? (
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <button
                    type="button"
                    onClick={openConnectModal}
                    className="w-full min-h-[56px] flex items-center justify-center rounded-full bg-[#0a0a0a] hover:bg-[#1f1f1f] text-[#fffaf0] font-medium text-base shadow-[0_14px_28px_rgba(10,10,10,0.3)] cursor-pointer transition-all"
                  >
                    {lang === "en" ? "Connect wallet to pay" : "भुगतान के लिए वॉलेट कनेक्ट करें"}
                  </button>
                )}
              </ConnectButton.Custom>
            ) : isWrongChain ? (
              <button
                type="button"
                onClick={() => switchChain({ chainId: avalancheFuji.id })}
                className="w-full min-h-[56px] flex items-center justify-center rounded-full bg-[#0a0a0a] hover:bg-[#1f1f1f] text-[#fffaf0] font-medium text-base shadow-[0_14px_28px_rgba(10,10,10,0.3)] cursor-pointer transition-all"
              >
                {lang === "en" ? "Switch to Avalanche Fuji" : "Avalanche Fuji पर स्विच करें"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePay}
                disabled={effectivePaymentStep !== "idle" || !!pendingTxHash || !isConfiguredAddress(invoice?.network?.routerAddress)}
                className="w-full min-h-[56px] flex items-center justify-center rounded-full bg-[#0a0a0a] hover:bg-[#1f1f1f] text-[#fffaf0] font-medium text-base shadow-[0_14px_28px_rgba(10,10,10,0.3)] cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed transition-all"
              >
                {effectivePaymentStep === "approving"
                  ? (lang === "en" ? "Approving USDC..." : "स्वीकृत किया जा रहा है...")
                  : effectivePaymentStep === "paying"
                  ? (lang === "en" ? "Paying on-chain..." : "भुगतान किया जा रहा है...")
                  : isAlreadyPaid || (effectivePaymentStep as string) === "confirmed"
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
            {!isConfiguredAddress(invoice?.network?.routerAddress) && (
              <div className="text-center text-xs text-[#991b1b] font-medium mt-1.5">
                {lang === "en"
                  ? "Contract address not configured in this environment. Payment is disabled."
                  : "इस परिवेश में अनुबंध पता कॉन्फ़िगर नहीं है। भुगतान अक्षम है।"}
              </div>
            )}
          </div>
          <div className="text-center text-xs text-[#6a6a6a]">
            Avalanche Fuji · chain 43113
          </div>
        </div>
      )}
    </div>
  );
}
