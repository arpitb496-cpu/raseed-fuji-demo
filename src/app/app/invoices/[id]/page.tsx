"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { useI18n } from "@/lib/i18n";
import { formatUsdc } from "@/lib/currency";
import { formatUnambiguousDate } from "@/lib/utils/date";
import { useInrRate } from "@/hooks/useInrRate";
import { formatInrReferenceLabel } from "@/lib/rate";
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
  Share2,
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
  auditLogs?: Array<{
    id: string;
    action: string;
    details: string | null;
    createdAt: string;
  }>;
}

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t, lang } = useI18n();
  const { rate: inrRate, asOf: inrAsOf } = useInrRate();

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [downloadingType, setDownloadingType] = useState<"pdf" | "receipt" | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async (type: "pdf" | "receipt") => {
    if (!invoice) return;
    setDownloadingType(type);
    setDownloadError(null);
    try {
      const endpoint = type === "pdf" ? `/api/invoices/${invoice.id}/pdf` : `/api/invoices/${invoice.id}/receipt`;
      const filename = type === "pdf" ? `${invoice.invoiceNumber}.pdf` : `Receipt-${invoice.invoiceNumber}.pdf`;
      const res = await fetch(endpoint);
      if (!res.ok) {
        throw new Error(t("invoiceDetail.downloadFailed"));
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.error("Download error:", err);
      setDownloadError(
        err instanceof Error && err.message
          ? err.message
          : t("invoiceDetail.downloadFailed")
      );
    } finally {
      setDownloadingType(null);
    }
  };

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
      <div className="py-24 text-center text-xs text-[#6a6a6a] flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-[#0a0a0a]" />
        <span>Loading invoice details...</span>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#fee2e2] text-[#991b1b] flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-display font-medium text-[#0a0a0a]">
          {error || t("errors.invoiceNotFound")}
        </h1>
        <Link
          href="/app/invoices"
          className="inline-flex items-center gap-1.5 text-xs text-[#0a0a0a] hover:text-[#b64d31] font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {t("invoiceDetail.backToList")}
        </Link>
      </div>
    );
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const payUrl = `${origin}/pay/${invoice.publicId}`;
  const totalMicro = BigInt(invoice.amountUsdc);
  const approxInr =
    inrRate !== null
      ? (Number(invoice.amountUsdc) / 1_000_000 * inrRate).toLocaleString("en-IN", {
          maximumFractionDigits: 2,
        })
      : null;

  const isPayable = invoice.status === "SENT" || invoice.status === "PARTIALLY_PAID";
  const isDraft = invoice.status === "DRAFT";

  const recipient = invoice.clientEmail ? invoice.clientEmail.trim() : "";
  const emailSubject = `Invoice ${invoice.title}`;
  const emailBody = `Payment link: ${payUrl}`;
  const mailtoHref = recipient
    ? `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
    : `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

  const waMessage = `Invoice payment link for ${invoice.title}: ${payUrl}`;
  const waHref = `https://wa.me/?text=${encodeURIComponent(waMessage)}`;

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; color: string; border: string }> = {
      PAID: { bg: "#a4d4c5", text: t("status.paid"), color: "#0a0a0a", border: "rgba(10,10,10,0.15)" },
      SENT: { bg: "#ffb084", text: t("status.sent"), color: "#0a0a0a", border: "rgba(10,10,10,0.15)" },
      PARTIALLY_PAID: { bg: "#e8b94a", text: t("status.partiallyPaid"), color: "#0a0a0a", border: "rgba(10,10,10,0.15)" },
      DRAFT: { bg: "#ebe6d6", text: t("status.draft"), color: "#3a3a3a", border: "#e5e5e5" },
      EXPIRED: { bg: "#fee2e2", text: t("status.expired"), color: "#991b1b", border: "#fecaca" },
      CANCELLED: { bg: "#f5f0e0", text: t("status.cancelled"), color: "#6a6a6a", border: "#e5e5e5" },
    };
    const s = map[status] || { bg: "#f5f0e0", text: status, color: "#3a3a3a", border: "#e5e5e5" };
    return (
      <span
        id="invoice-status-badge"
        style={{
          backgroundColor: s.bg,
          color: s.color,
          border: `1px solid ${s.border}`,
        }}
        className="inline-flex items-center px-3 py-1 rounded-[9px] text-xs font-medium"
      >
        {s.text}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/app/invoices"
          className="inline-flex items-center gap-1.5 text-xs text-[#0a0a0a] hover:text-[#b64d31] font-medium min-h-[44px]"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {t("invoiceDetail.backToList")}
        </Link>

        {/* Mobile top action buttons (< 1024px) */}
        <div className="lg:hidden flex flex-wrap items-center gap-2">
          {invoice.status === "DRAFT" && (
            <button
              id="send-invoice-btn"
              onClick={() => handleStatusAction("SEND")}
              disabled={isUpdating}
              className="clay-btn-primary !min-h-[42px] !py-2 !px-4 !text-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{t("invoiceDetail.markSent")}</span>
            </button>
          )}

          <button
            id="download-pdf-btn"
            type="button"
            onClick={() => handleDownload("pdf")}
            disabled={downloadingType !== null}
            className="clay-btn-secondary !min-h-[42px] !py-2 !px-4 !text-xs"
          >
            {downloadingType === "pdf" ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{t("invoiceDetail.preparingPdf")}</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>{t("invoiceDetail.downloadPdf")}</span>
              </>
            )}
          </button>

          {invoice.paymentEvents.length > 0 && (
            <button
              id="download-receipt-btn"
              type="button"
              onClick={() => handleDownload("receipt")}
              disabled={downloadingType !== null}
              className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[42px] rounded-[12px] border border-[#0a0a0a]/15 bg-[#a4d4c5] text-xs font-medium text-[#0a0a0a] cursor-pointer transition-colors disabled:opacity-60"
            >
              {downloadingType === "receipt" ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t("invoiceDetail.preparingReceipt")}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{t("invoiceDetail.downloadReceipt")}</span>
                </>
              )}
            </button>
          )}

          {downloadError && (
            <div className="w-full text-xs text-[#ef4444] font-medium px-1">
              {downloadError}
            </div>
          )}

          {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
            <button
              id="cancel-invoice-btn"
              onClick={() => handleStatusAction("CANCEL")}
              disabled={isUpdating}
              className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[42px] rounded-[12px] border border-[#fecaca] bg-[#fee2e2] text-xs font-medium text-[#991b1b] hover:bg-rose-100 cursor-pointer disabled:opacity-50 transition-colors"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>{t("invoiceDetail.cancelInvoice")}</span>
            </button>
          )}
        </div>
      </div>

      {invoice.status === "CANCELLED" && (
        <div
          id="cancelled-banner"
          className="p-4 rounded-[14px] bg-[#fee2e2] border border-[#fecaca] text-xs text-[#991b1b] font-medium flex items-center gap-2"
        >
          <Ban className="w-4 h-4 text-[#991b1b]" />
          <span>{t("invoiceDetail.cancelledNotice")}</span>
        </div>
      )}

      {/* Two columns on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: QR + payment link + share + actions */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 sm:p-8 rounded-[24px] bg-[#faf5e8] border border-[#0a0a0a] flex flex-col sm:flex-row lg:flex-col items-center gap-6">
            <div className="p-3 rounded-[18px] bg-white border border-[#e5e5e5] shrink-0">
              {qrDataUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={qrDataUrl} alt="Payment QR Code" className="w-28 h-28 lg:w-36 lg:h-36 rounded-lg" />
              ) : (
                <div className="w-28 h-28 lg:w-36 lg:h-36 bg-[#f5f0e0] animate-pulse rounded-lg" />
              )}
            </div>

            <div className="flex-1 space-y-3.5 w-full">
              <div>
                <div className="text-base font-display font-medium text-[#0a0a0a]">
                  {t("invoiceDetail.shareLink")}
                </div>
                <p className="text-xs text-[#3a3a3a] mt-0.5 leading-relaxed">
                  Send this unguessable link to your client. Payments execute peer-to-peer into your wallet.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full">
                <input
                  type="text"
                  readOnly
                  value={payUrl}
                  className="clay-input !py-2.5 text-xs font-mono truncate flex-1"
                />
                <button
                  onClick={handleCopy}
                  className="clay-btn-primary !px-4 !text-xs shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? t("common.copied") : t("common.copy")}</span>
                </button>
              </div>

              {/* Share by Email and WhatsApp */}
              <div className="pt-1 flex flex-wrap items-center gap-2.5">
                {isPayable ? (
                  <a
                    id="send-by-email-btn"
                    href={mailtoHref}
                    className="clay-btn-secondary !min-h-[42px] !py-2 !px-3.5 !text-xs"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#b64d31]" />
                    <span>{t("invoiceDetail.sendByEmail")}</span>
                  </a>
                ) : (
                  <span
                    id="send-by-email-btn"
                    aria-disabled="true"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[42px] rounded-[12px] border border-[#e5e5e5] bg-[#f5f0e0] text-xs font-medium text-[#6a6a6a] opacity-60 cursor-not-allowed"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>{t("invoiceDetail.sendByEmail")}</span>
                  </span>
                )}

                {isPayable ? (
                  <a
                    id="share-whatsapp-btn"
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="clay-btn-secondary !min-h-[42px] !py-2 !px-3.5 !text-xs"
                  >
                    <Share2 className="w-3.5 h-3.5 text-[#173f32]" />
                    <span>{t("invoiceDetail.shareWhatsApp")}</span>
                  </a>
                ) : (
                  <span
                    id="share-whatsapp-btn"
                    aria-disabled="true"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[42px] rounded-[12px] border border-[#e5e5e5] bg-[#f5f0e0] text-xs font-medium text-[#6a6a6a] opacity-60 cursor-not-allowed"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{t("invoiceDetail.shareWhatsApp")}</span>
                  </span>
                )}

                {isDraft && (
                  <span className="text-[11px] text-[#6a6a6a] font-medium w-full">
                    {t("invoiceDetail.markAsSentHint")}
                  </span>
                )}
              </div>

              {/* Desktop actions */}
              <div className="hidden lg:flex flex-col gap-2.5 pt-4 border-t border-[#e5e5e5] w-full">
                {invoice.status === "DRAFT" && (
                  <button
                    onClick={() => handleStatusAction("SEND")}
                    disabled={isUpdating}
                    className="clay-btn-primary w-full"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{t("invoiceDetail.markSent")}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleDownload("pdf")}
                  disabled={downloadingType !== null}
                  className="clay-btn-secondary w-full"
                >
                  {downloadingType === "pdf" ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{t("invoiceDetail.preparingPdf")}</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>{t("invoiceDetail.downloadPdf")}</span>
                    </>
                  )}
                </button>

                {invoice.paymentEvents.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleDownload("receipt")}
                    disabled={downloadingType !== null}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-[12px] border border-[#0a0a0a]/15 bg-[#a4d4c5] text-xs font-medium text-[#0a0a0a] cursor-pointer transition-colors disabled:opacity-60"
                  >
                    {downloadingType === "receipt" ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{t("invoiceDetail.preparingReceipt")}</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{t("invoiceDetail.downloadReceipt")}</span>
                      </>
                    )}
                  </button>
                )}

                {downloadError && (
                  <div className="w-full text-xs text-[#ef4444] font-medium px-1 text-center">
                    {downloadError}
                  </div>
                )}

                {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
                  <button
                    onClick={() => handleStatusAction("CANCEL")}
                    disabled={isUpdating}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-[12px] border border-[#fecaca] bg-[#fee2e2] text-xs font-medium text-[#991b1b] hover:bg-rose-100 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>{t("invoiceDetail.cancelInvoice")}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Invoice Details + Payment Events */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 sm:p-8 rounded-[24px] bg-[#faf5e8] border border-[#e5e5e5] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-[#e5e5e5]">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-mono font-medium text-[#b64d31]">
                    {invoice.invoiceNumber}
                  </span>
                  {getStatusBadge(invoice.status)}
                </div>
                <h1 className="text-2xl sm:text-3xl font-display font-medium tracking-[-0.03em] text-[#0a0a0a] mt-2">
                  {invoice.title}
                </h1>
                <div className="text-[11px] text-[#6a6a6a] mt-1 font-mono">
                  On-chain ID: {invoice.onchainInvoiceId.slice(0, 10)}...{invoice.onchainInvoiceId.slice(-8)}
                </div>
              </div>

              <div className="text-left sm:text-right">
                <div className="text-2xl sm:text-3xl font-light font-mono tabular-nums text-[#0a0a0a]">
                  {formatUsdc(totalMicro)} <span className="text-xs font-normal text-[#6a6a6a]">USDC</span>
                </div>
                {approxInr !== null && inrRate !== null && inrAsOf !== null && (
                  <div className="text-xs text-[#6a6a6a] mt-0.5">
                    ~₹{approxInr} INR ({formatInrReferenceLabel(inrRate, inrAsOf, lang)})
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-4 rounded-[16px] bg-[#f5f0e0] border border-[#e5e5e5]">
                <div className="text-[#6a6a6a] text-[11px] font-medium flex items-center gap-1.5 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-[#b64d31]" /> Due Date
                </div>
                <div className="font-medium text-xs text-[#0a0a0a]">
                  {formatUnambiguousDate(invoice.dueDate, lang)}
                </div>
              </div>

              <div className="p-4 rounded-[16px] bg-[#f5f0e0] border border-[#e5e5e5]">
                <div className="text-[#6a6a6a] text-[11px] font-medium flex items-center gap-1.5 mb-1">
                  <User className="w-3.5 h-3.5 text-[#173f32]" /> Client Name
                </div>
                <div className="font-medium text-xs text-[#0a0a0a]">
                  {invoice.clientName || "—"}
                </div>
              </div>

              <div className="p-4 rounded-[16px] bg-[#f5f0e0] border border-[#e5e5e5]">
                <div className="text-[#6a6a6a] text-[11px] font-medium flex items-center gap-1.5 mb-1">
                  <Mail className="w-3.5 h-3.5 text-[#b64d31]" /> Client Email
                </div>
                <div className="font-medium text-xs text-[#0a0a0a] truncate">
                  {invoice.clientEmail || "—"}
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-base font-display font-medium text-[#0a0a0a] mb-3">
                {t("newInvoice.lineItems")}
              </h2>
              <div className="rounded-[16px] border border-[#e5e5e5] overflow-hidden bg-[#fffaf0]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#f5f0e0] text-[#3a3a3a] border-b border-[#e5e5e5]">
                      <th className="py-3 px-4 font-medium">{t("newInvoice.itemDesc")}</th>
                      <th className="py-3 px-4 font-medium text-center w-20">{t("newInvoice.itemQty")}</th>
                      <th className="py-3 px-4 font-medium text-right w-32">{t("newInvoice.itemPrice")}</th>
                      <th className="py-3 px-4 font-medium text-right w-32">{t("newInvoice.itemTotal")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e5e5]">
                    {invoice.items.map((it) => {
                      const lineTotal = BigInt(it.unitAmountUsdc) * BigInt(it.quantity);
                      return (
                        <tr key={it.id}>
                          <td className="py-3.5 px-4 font-medium text-[#0a0a0a]">
                            {it.description}
                          </td>
                          <td className="py-3.5 px-4 text-center text-[#6a6a6a]">
                            {it.quantity}
                          </td>
                          <td className="py-3.5 px-4 text-right text-[#6a6a6a] font-mono">
                            {formatUsdc(BigInt(it.unitAmountUsdc))} USDC
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-medium text-[#0a0a0a]">
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
              <div className="p-4 rounded-[16px] bg-[#f5f0e0] border border-[#e5e5e5] text-xs">
                <div className="font-medium text-[#0a0a0a] mb-1">
                  {t("newInvoice.notesLabel")}
                </div>
                <p className="text-[#3a3a3a] whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* Verified Payment Events Table */}
          <div className="p-5 sm:p-6 rounded-[24px] bg-[#faf5e8] border border-[#e5e5e5] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-display font-medium text-[#0a0a0a] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#173f32]" />
                <span>{t("invoiceDetail.settlementHistory")}</span>
              </h2>

              {BigInt(invoice.paidAmountUsdc) > BigInt(invoice.amountUsdc) && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#b8a4ed] text-[#0a0a0a]">
                  {t("invoiceDetail.overpaid")} (+{formatUsdc(BigInt(invoice.paidAmountUsdc) - BigInt(invoice.amountUsdc))} USDC)
                </span>
              )}
            </div>

            {invoice.paymentEvents.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#6a6a6a] border border-dashed border-[#e5e5e5] rounded-[16px] bg-[#fffaf0]">
                {t("invoiceDetail.noPaymentsYet")}
              </div>
            ) : (
              <div className="rounded-[16px] border border-[#e5e5e5] overflow-x-auto text-xs bg-[#fffaf0]">
                <table className="w-full min-w-[500px] lg:min-w-0 text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f5f0e0] text-[#3a3a3a] border-b border-[#e5e5e5]">
                      <th className="py-2.5 px-2.5 sm:px-3 font-medium">{t("invoiceDetail.colConfirmed")}</th>
                      <th className="py-2.5 px-2.5 sm:px-3 font-medium">{t("invoiceDetail.colPayer")}</th>
                      <th className="py-2.5 px-2.5 sm:px-3 font-medium">{t("invoiceDetail.colAmount")}</th>
                      <th className="py-2.5 px-2 sm:px-2.5 font-medium">{t("invoiceDetail.colStatusFlags")}</th>
                      <th className="py-2.5 px-2.5 sm:px-3 font-medium text-right">{t("invoiceDetail.colTransaction")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e5e5]">
                    {invoice.paymentEvents.map((pe) => {
                      const isLate = new Date(pe.confirmedAt) > new Date(invoice.dueDate);
                      const isDust = BigInt(pe.amountUsdc) < 10000n;
                      const isCancelled = invoice.status === "CANCELLED";
                      const isPaymentOnDraft = Boolean(
                        invoice.auditLogs?.some((l) => l.action === "PAYMENT_ON_DRAFT_INVOICE")
                      );

                      return (
                        <tr key={pe.id}>
                          <td className="py-2.5 px-2.5 sm:px-3 text-[#6a6a6a] whitespace-nowrap">
                            <div className="font-medium text-[#0a0a0a]">
                              {new Date(pe.confirmedAt).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-US", { day: "numeric", month: "short", year: "2-digit" })}
                            </div>
                            <div className="text-[10px] text-[#6a6a6a]">
                              {new Date(pe.confirmedAt).toLocaleTimeString(lang === "hi" ? "hi-IN" : "en-US", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </td>
                          <td className="py-2.5 px-2.5 sm:px-3 font-mono text-[11px] text-[#0a0a0a] whitespace-nowrap">
                            {pe.payerAddress.slice(0, 6)}…{pe.payerAddress.slice(-4)}
                          </td>
                          <td className="py-2.5 px-2.5 sm:px-3 font-mono font-medium text-[#173f32] whitespace-nowrap">
                            +{formatUsdc(BigInt(pe.amountUsdc))} USDC
                          </td>
                          <td className="py-2.5 px-2 sm:px-2.5 whitespace-nowrap space-x-1">
                            {isPaymentOnDraft && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#ffb084] text-[#0a0a0a]">
                                {t("invoiceDetail.statusOnDraft")}
                              </span>
                            )}
                            {isDust && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#ffb084] text-[#0a0a0a]">
                                {t("invoiceDetail.statusDust")}
                              </span>
                            )}
                            {isLate && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#fee2e2] text-[#991b1b]">
                                {t("invoiceDetail.statusLate")}
                              </span>
                            )}
                            {isCancelled && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#f5f0e0] text-[#3a3a3a]">
                                {t("invoiceDetail.statusOnCancelled")}
                              </span>
                            )}
                            {!isDust && !isLate && !isCancelled && !isPaymentOnDraft && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#a4d4c5] text-[#0a0a0a]">
                                {t("invoiceDetail.statusValid")}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-2.5 sm:px-3 text-right whitespace-nowrap">
                            <a
                              href={`${CURRENT_NETWORK.explorerUrl}/tx/${pe.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[#0a0a0a] hover:text-[#b64d31] text-xs font-medium underline underline-offset-4"
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
      </div>
    </div>
  );
}
