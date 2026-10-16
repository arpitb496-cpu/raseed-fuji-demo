"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAccount, useSwitchChain, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ERC20_ABI, PAYMENT_ROUTER_ABI } from "@/config/contracts";
import { avalancheFuji } from "viem/chains";
import { formatUnambiguousDate } from "@/lib/utils/date";
import { DEFAULT_CONFIRMATIONS } from "@/config/settlement";
import { ShieldCheck, Loader2 } from "lucide-react";

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

  const [mockState] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("mockState");
    }
    return null;
  });

  const rawRemainingUsdc = invoice ? BigInt(invoice.remainingUsdc) : 0n;
  const remainingUsdc = mockState === "paid" ? 0n : rawRemainingUsdc;
  const userBalance = mockState === "insufficient_usdc" ? 500_000n : (typeof usdcBalanceRaw === "bigint" ? usdcBalanceRaw : 0n);
  const currentAllowance = typeof allowanceRaw === "bigint" ? allowanceRaw : 0n;

  const isConnectedSim = mockState ? true : isConnected;
  const isWrongChain = mockState === "wrong_chain" ? true : (isConnectedSim && chain?.id !== (invoice?.network.chainId || avalancheFuji.id));
  const isCancelledOrExpired = (invoice?.status === "CANCELLED" || invoice?.status === "EXPIRED" || mockState === "cancelled" || mockState === "expired");
  const isDraft = (invoice?.status === "DRAFT" || mockState === "draft");
  const isAlreadyPaid = mockState === "paid" || invoice?.status === "PAID" || (remainingUsdc === 0n && invoice !== null && invoice.status !== "DRAFT");
  const hasInsufficientBalance = mockState === "insufficient_usdc" ? true : (isConnectedSim && !isWrongChain && userBalance < remainingUsdc);
  const effectivePaymentStep = mockState === "paying" ? "paying" : (mockState === "waiting_confirmation" || (pendingTxHash && !isAlreadyPaid)) ? "waiting_confirmation" : paymentStep;

  const formatUsdc = (micro: bigint | string) => {
    const val = typeof micro === "string" ? BigInt(micro) : micro;
    return (Number(val) / 1_000_000).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
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

    // Listen to client-side receipt if publicClient is available
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
        // 1. Call report endpoint
        const reportRes = await fetch(`/api/pay/${publicId}/report`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicId, txHash: activeTx }),
        });

        if (!reportRes.ok) {
          const errData = await reportRes.json().catch(() => ({}));
          const errMsg = typeof errData.error === "string" ? errData.error : `HTTP ${reportRes.status}`;

          // If the server confirms transaction reverted or failed on-chain, clear pending lock immediately
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
                ? `Verification report pending: ${errMsg}. Retrying...`
                : `सत्यापन रिपोर्ट लंबित: ${errMsg}। पुनः प्रयास जारी...`
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
                  ? `Waiting for blockchain block confirmations (at least ${DEFAULT_CONFIRMATIONS} confirmations required)...`
                  : `ब्लॉकचेन ब्लॉक पुष्टि की प्रतीक्षा है (कम से कम ${DEFAULT_CONFIRMATIONS} पुष्टि आवश्यक)...`
              );
            }
          }
        }

        // 2. Also poll GET /api/pay/[publicId] in case background reconciliation settled it
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
      } catch {
        if (!cancelled) {
          setReportStatusMessage(
            lang === "en"
              ? "Network issue contacting settlement server. Retrying..."
              : "निपटान सर्वर से संपर्क करने में समस्या। पुनः प्रयास जारी..."
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

    // Immediate initial check
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
      <div className="min-h-screen bg-[#F2F4FB] text-[#161A3A] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#4338CA] animate-spin" />
          <p className="text-xs text-[#5B6190]">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (notFound || !invoice) {
    return (
      <div className="min-h-screen bg-[#F2F4FB] text-[#161A3A] flex flex-col items-center justify-center p-6 text-center">
        <div className="p-8 max-w-md w-full rounded-[28px] bg-white border border-[#E6E9F5] shadow-[0_2px_8px_rgba(40,50,120,0.08)] flex flex-col items-center">
          <div className="w-16 h-16 rounded-[22px] bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center text-2xl font-bold mb-4">
            404
          </div>
          <h1 className="text-2xl font-extrabold text-[#161A3A] mb-2">Invoice Not Found</h1>
          <p className="text-[#4B517D] text-sm">
            The requested payment link is invalid, expired, or has been removed.
          </p>
        </div>
      </div>
    );
  }

  // Step indicator state
  const step2Done = currentAllowance >= remainingUsdc || isAlreadyPaid || effectivePaymentStep === "confirmed" || effectivePaymentStep === "waiting_confirmation" || effectivePaymentStep === "paying";
  const step2Active = isConnectedSim && !step2Done && (effectivePaymentStep === "approving" || currentAllowance < remainingUsdc);
  const step3Done = isAlreadyPaid || effectivePaymentStep === "confirmed";
  const step3Active = isConnectedSim && !step3Done && step2Done;

  return (
    <div className="min-h-screen bg-[#F2F4FB] text-[#161A3A] py-10 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-[#E6E9F5] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-[#4338CA] text-white flex items-center justify-center font-bold text-lg shadow-sm">
              C
            </div>
            <div>
              <span className="font-extrabold text-[#161A3A] tracking-tight">CryptoDao Pay</span>
              <span className="ml-2 text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-[#4338CA] border border-indigo-100 font-semibold">
                Avalanche Fuji
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "en" ? "hi" : "en")}
              className="text-xs px-3 py-2 min-h-[44px] rounded-[14px] bg-white border border-[#E6E9F5] text-[#4B517D] hover:bg-[#F2F4FB] transition font-semibold cursor-pointer"
            >
              {lang === "en" ? "हिन्दी" : "English"}
            </button>
            <ConnectButton showBalance={false} />
          </div>
        </div>

        {/* Step Indicator (Connect, Approve, Pay) */}
        <div className="bg-white rounded-[22px] border border-[#E6E9F5] p-4 shadow-[0_2px_8px_rgba(40,50,120,0.06)]">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {/* Step 1: Connect */}
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  isConnectedSim
                    ? "bg-[#D9F5E6] text-[#0B6B3A]"
                    : "bg-[#4338CA] text-white shadow-xs"
                }`}
              >
                {isConnectedSim ? "✓" : "1"}
              </div>
              <span
                className={`text-xs font-semibold ${
                  isConnectedSim ? "text-[#0B6B3A]" : "text-[#161A3A]"
                }`}
              >
                {lang === "en" ? "Connect" : "कनेक्ट"}
              </span>
            </div>

            <div
              className={`flex-1 h-0.5 mx-3 transition-colors ${
                isConnectedSim ? "bg-[#0B6B3A]/40" : "bg-[#E6E9F5]"
              }`}
            />

            {/* Step 2: Approve */}
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step2Done
                    ? "bg-[#D9F5E6] text-[#0B6B3A]"
                    : step2Active
                    ? "bg-[#4338CA] text-white animate-pulse"
                    : "bg-[#F2F4FB] text-[#5B6190]"
                }`}
              >
                {step2Done ? "✓" : "2"}
              </div>
              <span
                className={`text-xs font-semibold ${
                  step2Done
                    ? "text-[#0B6B3A]"
                    : step2Active
                    ? "text-[#4338CA]"
                    : "text-[#5B6190]"
                }`}
              >
                {lang === "en" ? "Approve" : "स्वीकृति"}
              </span>
            </div>

            <div
              className={`flex-1 h-0.5 mx-3 transition-colors ${
                step2Done ? "bg-[#0B6B3A]/40" : "bg-[#E6E9F5]"
              }`}
            />

            {/* Step 3: Pay */}
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step3Done
                    ? "bg-[#D9F5E6] text-[#0B6B3A]"
                    : step3Active
                    ? "bg-[#4338CA] text-white animate-pulse"
                    : "bg-[#F2F4FB] text-[#5B6190]"
                }`}
              >
                {step3Done ? "✓" : "3"}
              </div>
              <span
                className={`text-xs font-semibold ${
                  step3Done
                    ? "text-[#0B6B3A]"
                    : step3Active
                    ? "text-[#4338CA]"
                    : "text-[#5B6190]"
                }`}
              >
                {lang === "en" ? "Pay" : "भुगतान"}
              </span>
            </div>
          </div>
        </div>

        {/* Persistent Testnet Demo Notice */}
        <div
          role="banner"
          aria-label="Testnet demo notice"
          data-testid="pay-testnet-notice"
          className="bg-[#FFE9D1] border border-[#FED7AA] text-[#9A4B00] rounded-[18px] px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2 shadow-xs"
        >
          <div className="flex items-center gap-2 font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#9A4B00] animate-pulse shrink-0" />
            <span>Testnet Demo — No Real Money</span>
            <span className="text-[#9A4B00]/40">|</span>
            <span className="text-[#9A4B00]/90">टेस्टनेट डेमो — कोई वास्तविक धन नहीं</span>
          </div>
          <span className="text-[11px] font-mono text-[#9A4B00] font-semibold">Avalanche Fuji</span>
        </div>

        {/* White Rounded Invoice Card */}
        <div className="bg-white border border-[#E6E9F5] rounded-[28px] p-6 sm:p-8 shadow-[0_4px_24px_rgba(40,50,120,0.08)] relative overflow-hidden space-y-6">
          {/* Header Merchant & Due Date */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6E9F5] pb-6">
            <div>
              <span className="text-xs uppercase tracking-wider text-[#5B6190] font-semibold">
                {lang === "en" ? "Payment to" : "भुगतान प्राप्तकर्ता"}
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#161A3A] mt-0.5">
                {invoice.merchant.businessName || invoice.merchant.displayName}
              </h2>
              <p className="text-xs font-mono text-[#5B6190] mt-1 break-all">
                {invoice.merchant.walletAddress}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                  invoice.status === "PAID"
                    ? "bg-[#D9F5E6] text-[#0B6B3A] border-[#A7F3D0]"
                    : invoice.status === "PARTIALLY_PAID"
                    ? "bg-[#FFE9D1] text-[#9A4B00] border-[#FED7AA]"
                    : "bg-indigo-50 text-[#4338CA] border-indigo-100"
                }`}
              >
                {invoice.status}
              </span>
              <p className="text-xs text-[#5B6190] mt-1.5 font-medium">
                {lang === "en" ? "Due:" : "अंतिम तिथि:"}{" "}
                {formatUnambiguousDate(invoice.dueDate, lang)}
              </p>
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#161A3A] tracking-tight">{invoice.title}</h1>
            {invoice.notes && (
              <p className="text-sm text-[#4B517D] mt-1.5 whitespace-pre-wrap">{invoice.notes}</p>
            )}
          </div>

          {/* Line items table */}
          <div className="border border-[#E6E9F5] rounded-[20px] overflow-hidden bg-[#F2F4FB]/50">
            <div className="grid grid-cols-12 text-xs font-semibold uppercase text-[#5B6190] px-4 py-3 bg-[#F2F4FB] border-b border-[#E6E9F5]">
              <div className="col-span-7">{lang === "en" ? "Item" : "विवरण"}</div>
              <div className="col-span-2 text-center">{lang === "en" ? "Qty" : "मात्रा"}</div>
              <div className="col-span-3 text-right">{lang === "en" ? "Price" : "मूल्य"}</div>
            </div>
            <div className="divide-y divide-[#E6E9F5]">
              {invoice.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 text-sm px-4 py-3 items-center">
                  <div className="col-span-7 font-medium text-[#161A3A]">{item.description}</div>
                  <div className="col-span-2 text-center text-[#5B6190]">{item.quantity}</div>
                  <div className="col-span-3 text-right font-mono text-[#161A3A]">
                    {formatUsdc(item.unitAmountUsdc)} USDC
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Big Total & Remaining breakdown */}
          <div className="bg-[#F2F4FB]/70 border border-[#E6E9F5] rounded-[22px] p-6 space-y-2.5">
            <div className="flex justify-between text-sm text-[#5B6190]">
              <span>{lang === "en" ? "Invoice Total" : "कुल राशि"}</span>
              <span className="font-mono font-medium text-[#161A3A]">{formatUsdc(invoice.amountUsdc)} USDC</span>
            </div>
            {BigInt(invoice.paidAmountUsdc) > 0n && (
              <div className="flex justify-between text-sm text-[#0B6B3A] font-medium">
                <span>{lang === "en" ? "Already Paid" : "पूर्व भुगतान"}</span>
                <span className="font-mono">-{formatUsdc(invoice.paidAmountUsdc)} USDC</span>
              </div>
            )}
            <div className="pt-3 border-t border-[#E6E9F5] flex justify-between items-baseline">
              <span className="text-base font-bold text-[#161A3A]">
                {lang === "en" ? "Remaining Balance" : "शेष देय राशि"}
              </span>
              <span className="text-3xl sm:text-4xl font-extrabold font-mono text-[#161A3A]">
                {formatUsdc(invoice.remainingUsdc)} <span className="text-base font-normal text-[#5B6190]">USDC</span>
              </span>
            </div>
          </div>

          {/* Green "exact approval, never unlimited" info box */}
          <div className="bg-[#D9F5E6] border border-[#A7F3D0] text-[#0B6B3A] rounded-[20px] p-4 text-xs font-medium flex items-center gap-3 shadow-xs">
            <ShieldCheck className="w-5 h-5 shrink-0 text-[#0B6B3A]" />
            <div>
              <div className="font-bold text-[#0B6B3A]">
                {lang === "en" ? "Exact approval, never unlimited" : "सटीक स्वीकृति, कभी असीमित नहीं"}
              </div>
              <div className="text-[11px] text-[#0B6B3A]/90 mt-0.5">
                {lang === "en"
                  ? "Allowance requests are strictly capped to the exact invoice amount. No unlimited token access."
                  : "स्वीकृति अनुरोध केवल चालान की सटीक राशि तक सीमित हैं। कोई असीमित टोकन पहुंच नहीं।"}
              </div>
            </div>
          </div>

          {/* Payment actions & confirmation */}
          {isCancelledOrExpired ? (
            <div className="p-6 rounded-[22px] bg-rose-50 border border-rose-200 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-lg mx-auto">
                ✕
              </div>
              <h3 className="text-base font-bold text-rose-800">
                {lang === "en" ? "Invoice Cancelled or Expired" : "चालान रद्द या समाप्त हो चुका है"}
              </h3>
              <p className="text-xs text-rose-700/80">
                {lang === "en"
                  ? "This invoice is no longer active and cannot accept new payments."
                  : "यह चालान अब सक्रिय नहीं है और नया भुगतान स्वीकार नहीं कर सकता।"}
              </p>
            </div>
          ) : isDraft ? (
            <div className="p-6 rounded-[22px] bg-[#FFE9D1] border border-[#FED7AA] text-center space-y-2" data-testid="draft-blocked-notice">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-[#9A4B00] flex items-center justify-center font-bold text-lg mx-auto">
                !
              </div>
              <h3 className="text-base font-bold text-[#9A4B00]">
                {lang === "en" ? "Invoice Not Yet Issued" : "चालान अभी जारी नहीं किया गया है"}
              </h3>
              <p className="text-xs text-[#9A4B00]/90 max-w-md mx-auto">
                {lang === "en"
                  ? "This invoice is in draft status and has not yet been issued by the merchant. Payments cannot be accepted until issued."
                  : "यह चालान अभी ड्राफ्ट स्थिति में है और व्यापारी द्वारा जारी नहीं किया गया है। जारी किए जाने तक भुगतान स्वीकार नहीं किया जा सकता।"}
              </p>
            </div>
          ) : effectivePaymentStep === "confirmed" || isAlreadyPaid ? (
            <div className="p-6 rounded-[22px] bg-[#D9F5E6] border border-[#A7F3D0] text-center space-y-3" data-testid="payment-confirmed-notice">
              <div className="w-12 h-12 rounded-full bg-[#0B6B3A]/10 text-[#0B6B3A] flex items-center justify-center text-xl font-bold mx-auto">
                ✓
              </div>
              <h3 className="text-lg font-bold text-[#0B6B3A]">
                {lang === "en" ? "Payment Completed Successfully!" : "भुगतान सफलतापूर्वक संपन्न हुआ!"}
              </h3>
              <p className="text-xs text-[#0B6B3A]/90">
                {lang === "en"
                  ? "Your transaction has been confirmed on Avalanche Fuji."
                  : "आपका लेनदेन Avalanche Fuji पर पुष्ट हो गया है।"}
              </p>
              {txHash && (
                <div className="pt-2">
                  <a
                    href={`${invoice.network.explorerUrl}/tx/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#0B6B3A] hover:underline font-mono font-bold"
                  >
                    {lang === "en" ? "View on Snowtrace Explorer ↗" : "Snowtrace एक्सप्लोरर पर देखें ↗"}
                  </a>
                </div>
              )}
            </div>
          ) : effectivePaymentStep === "waiting_confirmation" ? (
            <div className="p-6 rounded-[22px] bg-[#FFE9D1] border border-[#FED7AA] text-center space-y-3" data-testid="payment-waiting-notice">
              <div className="animate-spin rounded-full h-10 w-10 border-3 border-[#9A4B00] border-t-transparent mx-auto" />
              <h3 className="text-lg font-bold text-[#9A4B00]">
                {lang === "en" ? "Submitted, waiting for confirmations..." : "प्रस्तुत किया गया, पुष्टि की प्रतीक्षा की जा रही है..."}
              </h3>
              <p className="text-xs text-[#9A4B00]/90 max-w-md mx-auto">
                {lang === "en"
                  ? "Transaction broadcast to Avalanche Fuji. Polling server for block confirmations..."
                  : "लेनदेन Avalanche Fuji पर प्रसारित किया गया। ब्लॉक पुष्टि के लिए सर्वर से सत्यापन की प्रतीक्षा की जा रही है..."}
              </p>
              {reportStatusMessage && (
                <div className="p-3 rounded-[14px] bg-white/70 border border-[#FED7AA] text-[#9A4B00] text-xs font-mono max-w-md mx-auto" data-testid="report-status-message">
                  {reportStatusMessage}
                </div>
              )}
              {(txHash || pendingTxHash) && (
                <div className="pt-1">
                  <a
                    href={`${invoice.network.explorerUrl}/tx/${txHash || pendingTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#9A4B00] hover:underline font-mono font-bold"
                  >
                    {lang === "en" ? "View Transaction on Snowtrace ↗" : "Snowtrace पर लेनदेन देखें ↗"}
                  </a>
                </div>
              )}
              <div className="pt-2 border-t border-[#FED7AA]/60">
                <button
                  type="button"
                  onClick={() =>
                    clearPendingTx(
                      lang === "en"
                        ? "Pending transaction state cleared. You can try paying again."
                        : "लंबित लेनदेन स्थिति हटा दी गई। आप पुनः भुगतान का प्रयास कर सकते हैं।"
                    )
                  }
                  className="text-xs text-[#9A4B00] hover:underline transition cursor-pointer font-semibold min-h-[44px] inline-flex items-center"
                  data-testid="clear-pending-tx-btn"
                >
                  {lang === "en"
                    ? "Stuck? Clear pending status to retry"
                    : "अटका हुआ है? पुनः प्रयास करने के लिए लंबित स्थिति हटाएं"}
                </button>
              </div>
            </div>
          ) : !isConnectedSim ? (
            <div className="text-center p-6 bg-[#F2F4FB]/80 border border-[#E6E9F5] rounded-[22px] space-y-4">
              <p className="text-sm text-[#4B517D]">
                {lang === "en"
                  ? "Connect your Web3 wallet to settle this invoice in native USDC."
                  : "मूल USDC में इस चालान का भुगतान करने के लिए अपना वॉलेट कनेक्ट करें।"}
              </p>
              <div className="flex justify-center">
                <ConnectButton />
              </div>
            </div>
          ) : isWrongChain ? (
            <div className="p-6 rounded-[22px] bg-[#FFE9D1] border border-[#FED7AA] space-y-3">
              <p className="text-sm text-[#9A4B00] font-bold">
                {lang === "en"
                  ? "Wrong network detected. Please switch your wallet to Avalanche Fuji."
                  : "गलत नेटवर्क का पता चला। कृपया Avalanche Fuji पर स्विच करें।"}
              </p>
              <button
                onClick={() => switchChain({ chainId: avalancheFuji.id })}
                className="w-full py-3 min-h-[48px] rounded-[18px] bg-[#4338CA] text-white font-bold text-sm hover:bg-[#2E259B] transition shadow-xs cursor-pointer"
              >
                {lang === "en" ? "Switch to Avalanche Fuji" : "Avalanche Fuji पर स्विच करें"}
              </button>
            </div>
          ) : hasInsufficientBalance ? (
            <div className="p-6 rounded-[22px] bg-rose-50 border border-rose-200 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-rose-700 font-bold">
                  {lang === "en" ? "Insufficient USDC balance" : "अपर्याप्त USDC शेष"}
                </span>
                <span className="font-mono text-[#4B517D] font-semibold">
                  {lang === "en" ? "Balance:" : "शेष:"} {formatUsdc(userBalance)} USDC
                </span>
              </div>
              <p className="text-xs text-rose-700/80">
                {lang === "en"
                  ? `You need ${formatUsdc(remainingUsdc)} USDC to settle this invoice.`
                  : `इस चालान के भुगतान के लिए आपको ${formatUsdc(remainingUsdc)} USDC की आवश्यकता है।`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {errorMessage && (
                <div className="p-4 rounded-[18px] bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {errorMessage}
                </div>
              )}

              {/* Large Indigo Pay Button */}
              <button
                onClick={handlePay}
                disabled={effectivePaymentStep !== "idle" || !!pendingTxHash}
                className="w-full py-4 min-h-[52px] rounded-[20px] bg-[#4338CA] hover:bg-[#2E259B] disabled:opacity-50 text-white font-bold text-base transition-all shadow-[0_8px_20px_rgba(67,56,202,0.25)] flex items-center justify-center gap-2 cursor-pointer"
              >
                {effectivePaymentStep === "approving" ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>{lang === "en" ? "Approving exact USDC amount..." : "सटीक USDC स्वीकृत किया जा रहा है..."}</span>
                  </>
                ) : effectivePaymentStep === "paying" ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>{lang === "en" ? "Executing payment on-chain..." : "ऑन-चेन भुगतान निष्पादित किया जा रहा है..."}</span>
                  </>
                ) : (
                  <span>
                    {lang === "en"
                      ? `Pay ${formatUsdc(remainingUsdc)} USDC`
                      : `${formatUsdc(remainingUsdc)} USDC का भुगतान करें`}
                  </span>
                )}
              </button>

              {/* Small router/disclosure text */}
              <p className="text-center text-xs text-[#5B6190]">
                {lang === "en"
                  ? "Exact allowance only. Zero custody. Direct settlement via PaymentRouter."
                  : "केवल सटीक अनुमति। शून्य हिरासत। PaymentRouter के माध्यम से सीधा निपटान।"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
