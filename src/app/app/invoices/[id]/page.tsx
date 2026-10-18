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
      <div className="py-24 text-center text-xs text-[#5B6190] flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-[#4338CA]" />
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
        <h1 className="text-xl font-bold text-[#161A3A]">
          {error || t("errors.invoiceNotFound")}
        </h1>
        <Link
          href="/app/invoices"
          className="inline-flex items-center gap-1.5 text-xs text-[#4338CA] hover:text-[#2E259B] font-semibold"
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
      PAID: { bg: "#D9F5E6", text: t("status.paid"), color: "#0B6B3A", border: "#A7F3D0" },
      SENT: { bg: "#EEF2FF", text: t("status.sent"), color: "#4338CA", border: "#C7D2FE" },
      PARTIALLY_PAID: { bg: "#FFE9D1", text: t("status.partiallyPaid"), color: "#9A4B00", border: "#FED7AA" },
      DRAFT: { bg: "#F2F4FB", text: t("status.draft"), color: "#5B6190", border: "#E6E9F5" },
      EXPIRED: { bg: "#FEE2E2", text: t("status.expired"), color: "#991B1B", border: "#FECACA" },
      CANCELLED: { bg: "#F2F4FB", text: t("status.cancelled"), color: "#5B6190", border: "#E6E9F5" },
    };
    const s = map[status] || { bg: "#F2F4FB", text: status, color: "#5B6190", border: "#E6E9F5" };
    return (
      <span
        id="invoice-status-badge"
        style={{
          backgroundColor: s.bg,
          color: s.color,
          border: `1px solid ${s.border}`,
        }}
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      >
        {s.text}
      </span>
    );
  };

  return (
    <div className="max-w-[1080px] mx-auto space-y-6">
      {/* Top Bar Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/app/invoices"
          className="inline-flex items-center gap-1.5 text-xs text-[#4338CA] hover:text-[#2E259B] font-semibold min-h-[44px]"
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
              className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-[14px] bg-[#4338CA] hover:bg-[#2E259B] text-white text-xs font-semibold shadow-sm cursor-pointer disabled:opacity-50 transition-colors"
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
            className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-[14px] border border-[#E6E9F5] bg-white text-[#161A3A] hover:bg-[#F2F4FB] text-xs font-semibold cursor-pointer transition-colors shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {downloadingType === "pdf" ? (
              <>
                <Loader2 className="w-3.5 h-3.5 text-[#5B6190] animate-spin" />
                <span>{t("invoiceDetail.preparingPdf")}</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-[#5B6190]" />
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
              className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-[14px] border border-[#A7F3D0] bg-[#D9F5E6] text-xs font-semibold text-[#0B6B3A] hover:bg-[#c3ebd4] cursor-pointer transition-colors shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {downloadingType === "receipt" ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-[#0B6B3A] animate-spin" />
                  <span>{t("invoiceDetail.preparingReceipt")}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0B6B3A]" />
                  <span>{t("invoiceDetail.downloadReceipt")}</span>
                </>
              )}
            </button>
          )}

          {downloadError && (
            <div className="w-full text-xs text-rose-600 font-medium px-1">
              {downloadError}
            </div>
          )}

          {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
            <button
              id="cancel-invoice-btn"
              onClick={() => handleStatusAction("CANCEL")}
              disabled={isUpdating}
              className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-[14px] border border-[#FECACA] bg-[#FEE2E2] text-xs font-semibold text-[#991B1B] hover:bg-rose-100 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>{t("invoiceDetail.cancelInvoice")}</span>
            </button>
          )}
        </div>
      </div>

      {invoice.status === "CANCELLED" && (
        <div id="cancelled-banner" className="p-4 rounded-[18px] bg-[#FEE2E2] border border-[#FECACA] text-xs text-[#991B1B] font-medium flex items-center gap-2">
          <Ban className="w-4 h-4 text-[#991B1B]" />
          <span>{t("invoiceDetail.cancelledNotice")}</span>
        </div>
      )}

      {/* Two columns on desktop: Left (col-span-5) QR + links + actions; Right (col-span-7) Details + line items + settlement */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: QR + payment link + Copy + Send by email + Share on WhatsApp + Download PDF + Cancel */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 sm:p-8 rounded-[24px] bg-white border border-[#E6E9F5] shadow-[0_2px_8px_rgba(40,50,120,0.06)] flex flex-col sm:flex-row lg:flex-col items-center gap-6">
            <div className="p-3 rounded-[20px] bg-white border border-[#E6E9F5] shrink-0 shadow-2xs">
              {qrDataUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={qrDataUrl} alt="Payment QR Code" className="w-28 h-28 lg:w-36 lg:h-36 rounded-lg" />
              ) : (
                <div className="w-28 h-28 lg:w-36 lg:h-36 bg-[#F2F4FB] animate-pulse rounded-lg" />
              )}
            </div>

            <div className="flex-1 space-y-3.5 w-full">
              <div>
                <div className="text-sm font-bold text-[#161A3A]">
                  {t("invoiceDetail.shareLink")}
                </div>
                <p className="text-xs text-[#5B6190] mt-0.5">
                  Send this unguessable link to your client. Payments execute peer-to-peer into your wallet.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full">
                <input
                  type="text"
                  readOnly
                  value={payUrl}
                  className="flex-1 px-4 py-2.5 text-xs rounded-[14px] bg-[#F2F4FB]/50 border border-[#E6E9F5] text-[#161A3A] font-mono truncate focus:outline-none focus:ring-2 focus:ring-[#4338CA] focus:ring-offset-1 min-h-[44px]"
                />
                <button
                  onClick={handleCopy}
                  className="px-4 py-2.5 rounded-[14px] bg-[#4338CA] hover:bg-[#2E259B] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 min-h-[44px] transition-colors shadow-sm"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? t("common.copied") : t("common.copy")}</span>
                </button>
              </div>

              {/* Share by Email and WhatsApp Buttons */}
              <div className="pt-1 flex flex-wrap items-center gap-2.5">
                {isPayable ? (
                  <a
                    id="send-by-email-btn"
                    href={mailtoHref}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-[14px] border border-[#E6E9F5] bg-white hover:bg-[#F2F4FB] text-xs font-semibold text-[#161A3A] transition-colors shadow-2xs"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#4338CA]" />
                    <span>{t("invoiceDetail.sendByEmail")}</span>
                  </a>
                ) : (
                  <span
                    id="send-by-email-btn"
                    aria-disabled="true"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-[14px] border border-[#E6E9F5] bg-[#F2F4FB]/60 text-xs font-semibold text-[#5B6190] opacity-50 cursor-not-allowed"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#5B6190]" />
                    <span>{t("invoiceDetail.sendByEmail")}</span>
                  </span>
                )}

                {isPayable ? (
                  <a
                    id="share-whatsapp-btn"
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-[14px] border border-[#E6E9F5] bg-white hover:bg-[#F2F4FB] text-xs font-semibold text-[#161A3A] transition-colors shadow-2xs"
                  >
                    <Share2 className="w-3.5 h-3.5 text-[#0B6B3A]" />
                    <span>{t("invoiceDetail.shareWhatsApp")}</span>
                  </a>
                ) : (
                  <span
                    id="share-whatsapp-btn"
                    aria-disabled="true"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-[14px] border border-[#E6E9F5] bg-[#F2F4FB]/60 text-xs font-semibold text-[#5B6190] opacity-50 cursor-not-allowed"
                  >
                    <Share2 className="w-3.5 h-3.5 text-[#5B6190]" />
                    <span>{t("invoiceDetail.shareWhatsApp")}</span>
                  </span>
                )}

                {isDraft && (
                  <span className="text-[11px] text-[#5B6190] font-medium w-full">
                    {t("invoiceDetail.markAsSentHint")}
                  </span>
                )}
              </div>

              {/* Actions on desktop */}
              <div className="hidden lg:flex flex-col gap-2.5 pt-4 border-t border-[#E6E9F5] w-full">
                {invoice.status === "DRAFT" && (
                  <button
                    onClick={() => handleStatusAction("SEND")}
                    disabled={isUpdating}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-[14px] bg-[#4338CA] hover:bg-[#2E259B] text-white text-xs font-semibold shadow-sm cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{t("invoiceDetail.markSent")}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleDownload("pdf")}
                  disabled={downloadingType !== null}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-[14px] border border-[#E6E9F5] bg-white text-[#161A3A] hover:bg-[#F2F4FB] text-xs font-semibold cursor-pointer transition-colors shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {downloadingType === "pdf" ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 text-[#5B6190] animate-spin" />
                      <span>{t("invoiceDetail.preparingPdf")}</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5 text-[#5B6190]" />
                      <span>{t("invoiceDetail.downloadPdf")}</span>
                    </>
                  )}
                </button>

                {invoice.paymentEvents.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleDownload("receipt")}
                    disabled={downloadingType !== null}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-[14px] border border-[#A7F3D0] bg-[#D9F5E6] text-xs font-semibold text-[#0B6B3A] hover:bg-[#c3ebd4] cursor-pointer transition-colors shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {downloadingType === "receipt" ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 text-[#0B6B3A] animate-spin" />
                        <span>{t("invoiceDetail.preparingReceipt")}</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5 text-[#0B6B3A]" />
                        <span>{t("invoiceDetail.downloadReceipt")}</span>
                      </>
                    )}
                  </button>
                )}

                {downloadError && (
                  <div className="w-full text-xs text-rose-600 font-medium px-1 text-center">
                    {downloadError}
                  </div>
                )}

                {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
                  <button
                    onClick={() => handleStatusAction("CANCEL")}
                    disabled={isUpdating}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-[14px] border border-[#FECACA] bg-[#FEE2E2] text-xs font-semibold text-[#991B1B] hover:bg-rose-100 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>{t("invoiceDetail.cancelInvoice")}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Invoice Details Card + Verified Payment Events Table */}
        <div className="lg:col-span-7 space-y-6">
          {/* Invoice Details Card */}
          <div className="p-6 sm:p-8 rounded-[24px] bg-white border border-[#E6E9F5] shadow-[0_2px_8px_rgba(40,50,120,0.06)] space-y-6">
            {/* Header Block */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-[#E6E9F5]">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-bold text-[#4338CA]">
                    {invoice.invoiceNumber}
                  </span>
                  {getStatusBadge(invoice.status)}
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-[#161A3A] mt-1">
                  {invoice.title}
                </h1>
                <div className="text-[11px] text-[#5B6190] mt-1 font-mono">
                  On-chain ID: {invoice.onchainInvoiceId.slice(0, 10)}...{invoice.onchainInvoiceId.slice(-8)}
                </div>
              </div>

              <div className="text-left sm:text-right">
                <div className="text-2xl font-bold tracking-tight text-[#161A3A]">
                  {formatUsdc(totalMicro)} <span className="text-xs font-normal text-[#5B6190]">USDC</span>
                </div>
                <div className="text-xs text-[#5B6190] mt-0.5">
                  ~₹{approxInr} INR (illustrative demo rate, not a live rate)
                </div>
              </div>
            </div>

            {/* Client & Date Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-4 rounded-[18px] bg-[#F2F4FB]/50 border border-[#E6E9F5]">
                <div className="text-[#5B6190] text-[11px] font-semibold flex items-center gap-1.5 mb-1">
                  <Calendar className="w-3.5 h-3.5" /> Due Date
                </div>
                <div className="font-bold text-xs text-[#161A3A]">
                  {formatUnambiguousDate(invoice.dueDate, lang)}
                </div>
              </div>

              <div className="p-4 rounded-[18px] bg-[#F2F4FB]/50 border border-[#E6E9F5]">
                <div className="text-[#5B6190] text-[11px] font-semibold flex items-center gap-1.5 mb-1">
                  <User className="w-3.5 h-3.5" /> Client Name
                </div>
                <div className="font-bold text-xs text-[#161A3A]">
                  {invoice.clientName || "—"}
                </div>
              </div>

              <div className="p-4 rounded-[18px] bg-[#F2F4FB]/50 border border-[#E6E9F5]">
                <div className="text-[#5B6190] text-[11px] font-semibold flex items-center gap-1.5 mb-1">
                  <Mail className="w-3.5 h-3.5" /> Client Email
                </div>
                <div className="font-bold text-xs text-[#161A3A] truncate">
                  {invoice.clientEmail || "—"}
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <h2 className="text-sm font-bold text-[#161A3A] mb-3">
                {t("newInvoice.lineItems")}
              </h2>
              <div className="rounded-[18px] border border-[#E6E9F5] overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F2F4FB]/60 text-[#5B6190] border-b border-[#E6E9F5]">
                      <th className="py-3 px-4 font-semibold">{t("newInvoice.itemDesc")}</th>
                      <th className="py-3 px-4 font-semibold text-center w-20">{t("newInvoice.itemQty")}</th>
                      <th className="py-3 px-4 font-semibold text-right w-32">{t("newInvoice.itemPrice")}</th>
                      <th className="py-3 px-4 font-semibold text-right w-32">{t("newInvoice.itemTotal")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E9F5]">
                    {invoice.items.map((it) => {
                      const lineTotal = BigInt(it.unitAmountUsdc) * BigInt(it.quantity);
                      return (
                        <tr key={it.id}>
                          <td className="py-3.5 px-4 font-medium text-[#161A3A]">
                            {it.description}
                          </td>
                          <td className="py-3.5 px-4 text-center text-[#5B6190]">
                            {it.quantity}
                          </td>
                          <td className="py-3.5 px-4 text-right text-[#5B6190]">
                            {formatUsdc(BigInt(it.unitAmountUsdc))} USDC
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-[#161A3A]">
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
              <div className="p-4 rounded-[18px] bg-[#F2F4FB]/50 border border-[#E6E9F5] text-xs">
                <div className="font-semibold text-[#161A3A] mb-1">
                  {t("newInvoice.notesLabel")}
                </div>
                <p className="text-[#4B517D] whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* Verified Payment Events Table */}
          <div className="p-5 sm:p-6 rounded-[24px] bg-white border border-[#E6E9F5] shadow-[0_2px_8px_rgba(40,50,120,0.06)] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#161A3A] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#4338CA]" />
                <span>{t("invoiceDetail.settlementHistory")}</span>
              </h2>

              {BigInt(invoice.paidAmountUsdc) > BigInt(invoice.amountUsdc) && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                  {t("invoiceDetail.overpaid")} (+{formatUsdc(BigInt(invoice.paidAmountUsdc) - BigInt(invoice.amountUsdc))} USDC)
                </span>
              )}
            </div>

            {invoice.paymentEvents.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#5B6190] border border-dashed border-[#E6E9F5] rounded-[18px]">
                {t("invoiceDetail.noPaymentsYet")}
              </div>
            ) : (
              <div className="rounded-[18px] border border-[#E6E9F5] overflow-x-auto text-xs">
                <table className="w-full min-w-[500px] lg:min-w-0 text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F2F4FB]/60 text-[#5B6190] border-b border-[#E6E9F5]">
                      <th className="py-2.5 px-2.5 sm:px-3 font-semibold">{t("invoiceDetail.colConfirmed")}</th>
                      <th className="py-2.5 px-2.5 sm:px-3 font-semibold">{t("invoiceDetail.colPayer")}</th>
                      <th className="py-2.5 px-2.5 sm:px-3 font-semibold">{t("invoiceDetail.colAmount")}</th>
                      <th className="py-2.5 px-2 sm:px-2.5 font-semibold">{t("invoiceDetail.colStatusFlags")}</th>
                      <th className="py-2.5 px-2.5 sm:px-3 font-semibold text-right">{t("invoiceDetail.colTransaction")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E9F5]">
                    {invoice.paymentEvents.map((pe) => {
                      const isLate = new Date(pe.confirmedAt) > new Date(invoice.dueDate);
                      const isDust = BigInt(pe.amountUsdc) < 10000n;
                      const isCancelled = invoice.status === "CANCELLED";
                      const isPaymentOnDraft = Boolean(
                        invoice.auditLogs?.some((l) => l.action === "PAYMENT_ON_DRAFT_INVOICE")
                      );

                      return (
                        <tr key={pe.id}>
                          <td className="py-2.5 px-2.5 sm:px-3 text-[#5B6190] whitespace-nowrap">
                            <div className="font-medium text-[#161A3A]">
                              {new Date(pe.confirmedAt).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-US", { day: "numeric", month: "short", year: "2-digit" })}
                            </div>
                            <div className="text-[10px] text-[#5B6190]">
                              {new Date(pe.confirmedAt).toLocaleTimeString(lang === "hi" ? "hi-IN" : "en-US", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </td>
                          <td className="py-2.5 px-2.5 sm:px-3 font-mono text-[11px] text-[#161A3A] whitespace-nowrap">
                            {pe.payerAddress.slice(0, 6)}…{pe.payerAddress.slice(-4)}
                          </td>
                          <td className="py-2.5 px-2.5 sm:px-3 font-bold text-[#0B6B3A] whitespace-nowrap">
                            +{formatUsdc(BigInt(pe.amountUsdc))} USDC
                          </td>
                          <td className="py-2.5 px-2 sm:px-2.5 whitespace-nowrap space-x-1">
                            {isPaymentOnDraft && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-[#9A4B00] border border-[#FED7AA]">
                                {t("invoiceDetail.statusOnDraft")}
                              </span>
                            )}
                            {isDust && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-[#9A4B00] border border-[#FED7AA]">
                                {t("invoiceDetail.statusDust")}
                              </span>
                            )}
                            {isLate && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-[#991B1B] border border-[#FECACA]">
                                {t("invoiceDetail.statusLate")}
                              </span>
                            )}
                            {isCancelled && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F2F4FB] text-[#4B517D] border border-[#E6E9F5]">
                                {t("invoiceDetail.statusOnCancelled")}
                              </span>
                            )}
                            {!isDust && !isLate && !isCancelled && !isPaymentOnDraft && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#D9F5E6] text-[#0B6B3A]">
                                {t("invoiceDetail.statusValid")}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-2.5 sm:px-3 text-right whitespace-nowrap">
                            <a
                              href={`${CURRENT_NETWORK.explorerUrl}/tx/${pe.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[#4338CA] hover:text-[#2E259B] text-xs font-semibold"
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
