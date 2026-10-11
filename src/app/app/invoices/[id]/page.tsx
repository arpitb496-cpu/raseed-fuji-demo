"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { useI18n } from "@/lib/i18n";
import { formatUsdc } from "@/lib/currency";
import { formatUnambiguousDate } from "@/lib/utils/date";
import { INDICATIVE_USD_TO_INR_RATE } from "@/config/constants";
import { CURRENT_NETWORK } from "@/config/network";
import {
  ArrowLeft,
  Copy,
  Check,
  Download,
  Ban,
  Send,
  ExternalLink,
  Calendar,
  User,
  Mail,
  ShieldCheck,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface InvoiceDetail {
  id: string;
  publicId: string;
  invoiceNumber: string;
  title: string;
  notes: string | null;
  clientName: string | null;
  clientEmail: string | null;
  amountUsdc: string;
  paidAmountUsdc: string;
  status: string;
  dueDate: string;
  createdAt: string;
  onchainInvoiceId: string;
  merchant: {
    displayName: string;
    businessName: string | null;
    walletAddress: string;
  };
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitAmountUsdc: string;
  }>;
  paymentEvents: Array<{
    id: string;
    txHash: string;
    payerAddress: string;
    amountUsdc: string;
    blockNumber: string;
    confirmedAt: string;
  }>;
}

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t, lang } = useI18n();

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadInvoice() {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/invoices/${id}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load invoice.");
        }
        if (active) {
          setInvoice(data.invoice);
          // Generate payment link QR code
          const origin = typeof window !== "undefined" ? window.location.origin : "";
          const payUrl = `${origin}/pay/${data.invoice.publicId}`;
          const qr = await QRCode.toDataURL(payUrl, { width: 200, margin: 1 });
          if (active) {
            setQrDataUrl(qr);
          }
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : "Error loading invoice.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }
    loadInvoice();
    return () => {
      active = false;
    };
  }, [id, reloadKey]);

  const handleCopy = () => {
    if (!invoice) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const payUrl = `${origin}/pay/${invoice.publicId}`;
    navigator.clipboard.writeText(payUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStatusAction = async (action: "SEND" | "CANCEL") => {
    if (action === "CANCEL" && !confirm(t("invoiceDetail.cancelConfirm"))) {
      return;
    }

    try {
      setIsUpdating(true);
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Action failed.");
        return;
      }
      setReloadKey((k) => k + 1);
    } catch (err) {
      console.error("Action error:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
        <span>Loading invoice details...</span>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          {error || t("errors.invoiceNotFound")}
        </h1>
        <Link
          href="/app/invoices"
          className="inline-flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {t("invoiceDetail.backToList")}
        </Link>
      </div>
    );
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const payUrl = `${origin}/pay/${invoice.publicId}`;
  const totalMicro = BigInt(invoice.amountUsdc);
  const approxInr = (Number(invoice.amountUsdc) / 1_000_000 * INDICATIVE_USD_TO_INR_RATE).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      PAID: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", text: t("status.paid") },
      SENT: { bg: "bg-blue-50 text-blue-700 border-blue-200", text: t("status.sent") },
      PARTIALLY_PAID: { bg: "bg-amber-50 text-amber-700 border-amber-200", text: t("status.partiallyPaid") },
      DRAFT: { bg: "bg-slate-100 text-slate-700 border-slate-200", text: t("status.draft") },
      EXPIRED: { bg: "bg-rose-50 text-rose-700 border-rose-200", text: t("status.expired") },
      CANCELLED: { bg: "bg-slate-100 text-slate-500 border-slate-200", text: t("status.cancelled") },
    };
    const s = map[status] || { bg: "bg-slate-100 text-slate-700 border-slate-200", text: status };
    return (
      <span
        id="invoice-status-badge"
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.bg}`}
      >
        {s.text}
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Bar Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/app/invoices"
          className="inline-flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {t("invoiceDetail.backToList")}
        </Link>

        <div className="flex items-center gap-2">
          {invoice.status === "DRAFT" && (
            <button
              onClick={() => handleStatusAction("SEND")}
              disabled={isUpdating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{t("invoiceDetail.markSent")}</span>
            </button>
          )}

          <a
            id="download-pdf-btn"
            href={`/api/invoices/${invoice.id}/pdf`}
            download={`${invoice.invoiceNumber}.pdf`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{t("invoiceDetail.downloadPdf")}</span>
          </a>

          {invoice.paymentEvents.length > 0 && (
            <a
              id="download-receipt-btn"
              href={`/api/invoices/${invoice.id}/receipt`}
              download={`Receipt-${invoice.invoiceNumber}.pdf`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Download Receipt / रसीद</span>
            </a>
          )}

          {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
            <button
              id="cancel-invoice-btn"
              onClick={() => handleStatusAction("CANCEL")}
              disabled={isUpdating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer disabled:opacity-50"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>{t("invoiceDetail.cancelInvoice")}</span>
            </button>
          )}
        </div>
      </div>

      {invoice.status === "CANCELLED" && (
        <div id="cancelled-banner" className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
          <Ban className="w-4 h-4 text-slate-500" />
          <span>{t("invoiceDetail.cancelledNotice")}</span>
        </div>
      )}

      {/* Shareable Link & QR Banner Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center gap-6">
        <div className="p-2 rounded-xl bg-white border border-slate-200 shrink-0 shadow-2xs">
          {qrDataUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={qrDataUrl} alt="Payment QR Code" className="w-28 h-28 rounded-lg" />
          ) : (
            <div className="w-28 h-28 bg-slate-100 animate-pulse rounded-lg" />
          )}
        </div>

        <div className="flex-1 space-y-3 w-full">
          <div>
            <div className="text-xs font-semibold text-slate-900 dark:text-white">
              {t("invoiceDetail.shareLink")}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Send this unguessable link to your client. Payments execute peer-to-peer into your wallet.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full">
            <input
              type="text"
              readOnly
              value={payUrl}
              className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono truncate focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? t("common.copied") : t("common.copy")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Details Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-100 dark:divide-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-bold text-teal-600 dark:text-teal-400">
                {invoice.invoiceNumber}
              </span>
              {getStatusBadge(invoice.status)}
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              {invoice.title}
            </h1>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">
              On-chain ID: {invoice.onchainInvoiceId.slice(0, 10)}...{invoice.onchainInvoiceId.slice(-8)}
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {formatUsdc(totalMicro)} <span className="text-xs font-normal text-slate-500">USDC</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              ~₹{approxInr} INR (illustrative demo rate, not a live rate)
            </div>
          </div>
        </div>

        {/* Client & Date Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <div className="text-slate-400 text-[11px] flex items-center gap-1 mb-1">
              <Calendar className="w-3.5 h-3.5" /> Due Date
            </div>
            <div className="font-semibold text-slate-800 dark:text-slate-200">
              {formatUnambiguousDate(invoice.dueDate, lang)}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <div className="text-slate-400 text-[11px] flex items-center gap-1 mb-1">
              <User className="w-3.5 h-3.5" /> Client Name
            </div>
            <div className="font-semibold text-slate-800 dark:text-slate-200">
              {invoice.clientName || "—"}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <div className="text-slate-400 text-[11px] flex items-center gap-1 mb-1">
              <Mail className="w-3.5 h-3.5" /> Client Email
            </div>
            <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
              {invoice.clientEmail || "—"}
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div>
          <h2 className="text-xs font-semibold text-slate-900 dark:text-white mb-3">
            {t("newInvoice.lineItems")}
          </h2>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2.5 px-4 font-semibold">{t("newInvoice.itemDesc")}</th>
                  <th className="py-2.5 px-4 font-semibold text-center w-20">{t("newInvoice.itemQty")}</th>
                  <th className="py-2.5 px-4 font-semibold text-right w-32">{t("newInvoice.itemPrice")}</th>
                  <th className="py-2.5 px-4 font-semibold text-right w-32">{t("newInvoice.itemTotal")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoice.items.map((it) => {
                  const lineTotal = BigInt(it.unitAmountUsdc) * BigInt(it.quantity);
                  return (
                    <tr key={it.id}>
                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {it.description}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">
                        {it.quantity}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                        {formatUsdc(BigInt(it.unitAmountUsdc))} USDC
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-white">
                        {formatUsdc(lineTotal)} USDC
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {invoice.notes && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
            <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("newInvoice.notesLabel")}
            </div>
            <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Verified Payment Events Table */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>{t("invoiceDetail.settlementHistory")}</span>
          </h2>

          {BigInt(invoice.paidAmountUsdc) > BigInt(invoice.amountUsdc) && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              Overpaid / अधिक भुगतान (+{formatUsdc(BigInt(invoice.paidAmountUsdc) - BigInt(invoice.amountUsdc))} USDC)
            </span>
          )}
        </div>

        {invoice.paymentEvents.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            {t("invoiceDetail.noPaymentsYet")}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500">
                  <th className="py-2.5 px-4 font-semibold">Confirmed</th>
                  <th className="py-2.5 px-4 font-semibold">Payer Address</th>
                  <th className="py-2.5 px-4 font-semibold">Amount</th>
                  <th className="py-2.5 px-4 font-semibold">Status Flags</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Transaction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoice.paymentEvents.map((pe) => {
                  const isLate = new Date(pe.confirmedAt) > new Date(invoice.dueDate);
                  const isDust = BigInt(pe.amountUsdc) < 10000n;
                  const isCancelled = invoice.status === "CANCELLED";

                  return (
                    <tr key={pe.id}>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {new Date(pe.confirmedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        {pe.payerAddress.slice(0, 6)}...{pe.payerAddress.slice(-4)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-emerald-600 whitespace-nowrap">
                        +{formatUsdc(BigInt(pe.amountUsdc))} USDC
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap space-x-1.5">
                        {isDust && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Dust (&lt;0.01 USDC)
                          </span>
                        )}
                        {isLate && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            Late / विलंबित
                          </span>
                        )}
                        {isCancelled && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                            On Cancelled Invoice
                          </span>
                        )}
                        {!isDust && !isLate && !isCancelled && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            Valid / वैध
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <a
                          href={`${CURRENT_NETWORK.explorerUrl}/tx/${pe.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 text-xs font-medium"
                        >
                          <span>Snowtrace</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
