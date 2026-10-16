"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { formatUsdc } from "@/lib/currency";
import { formatUnambiguousDate } from "@/lib/utils/date";
import { INDICATIVE_USD_TO_INR_RATE } from "@/config/constants";
import {
  FileText,
  PlusCircle,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Copy,
  Check,
  TrendingUp,
} from "lucide-react";

interface InvoiceSummary {
  id: string;
  publicId: string;
  invoiceNumber: string;
  title: string;
  clientName: string | null;
  amountUsdc: string;
  paidAmountUsdc: string;
  status: string;
  dueDate: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { t, lang } = useI18n();
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/invoices?limit=5");
        const data = await res.json();
        if (data.invoices) {
          setInvoices(data.invoices);
        }
      } catch (err) {
        console.error("Failed to load dashboard invoices:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Compute metrics
  const totalPaidMicro = invoices.reduce(
    (sum, inv) => sum + (inv.status === "PAID" ? BigInt(inv.amountUsdc) : BigInt(inv.paidAmountUsdc || 0)),
    0n
  );

  const totalOutstandingMicro = invoices.reduce(
    (sum, inv) =>
      sum + (inv.status === "SENT" || inv.status === "PARTIALLY_PAID"
        ? BigInt(inv.amountUsdc) - BigInt(inv.paidAmountUsdc || 0)
        : 0n),
    0n
  );

  const totalOverdueCount = invoices.filter((inv) => inv.status === "EXPIRED").length;

  const handleCopyLink = (publicId: string, id: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/pay/${publicId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      PAID: { bg: "bg-[#D9F5E6] text-[#0B6B3A] border-[#A7F3D0]", text: t("status.paid") },
      SENT: { bg: "bg-indigo-50 text-[#4338CA] border-indigo-100", text: t("status.sent") },
      PARTIALLY_PAID: { bg: "bg-[#FFE9D1] text-[#9A4B00] border-[#FED7AA]", text: t("status.partiallyPaid") },
      DRAFT: { bg: "bg-[#F2F4FB] text-[#4B517D] border-[#E6E9F5]", text: t("status.draft") },
      EXPIRED: { bg: "bg-rose-50 text-rose-700 border-rose-200", text: t("status.expired") },
      CANCELLED: { bg: "bg-slate-100 text-slate-500 border-slate-200", text: t("status.cancelled") },
    };
    const s = map[status] || { bg: "bg-slate-100 text-slate-700 border-slate-200", text: status };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${s.bg}`}>
        {s.text}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#161A3A]">
            {t("dashboard.title")}
          </h1>
          <p className="text-xs text-[#5B6190] mt-1 font-medium">
            {t("dashboard.subtitle")}
          </p>
        </div>
        <Link
          href="/app/invoices/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] rounded-[18px] bg-[#FF6B57] hover:bg-[#E85542] text-white font-semibold text-xs shadow-[0_4px_14px_rgba(255,107,87,0.35)] transition-all cursor-pointer shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t("invoices.newInvoice")}</span>
        </Link>
      </div>

      {/* Hero Indigo "Received" Card with Awaiting and Overdue Chips */}
      <div className="rounded-[26px] bg-gradient-to-br from-[#4338CA] via-[#4338CA] to-[#3730A3] p-6 sm:p-8 text-white shadow-[0_16px_32px_rgba(67,56,202,0.28)] relative overflow-hidden">
        {/* Decorative soft glow */}
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col gap-6 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-100 text-xs font-semibold uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>{t("dashboard.totalPaid")} (Received)</span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-white/15 backdrop-blur-md text-white border border-white/20">
              <TrendingUp className="w-3 h-3 text-emerald-300" />
              Fuji Testnet
            </span>
          </div>

          <div>
            <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
              {formatUsdc(totalPaidMicro)} <span className="text-lg sm:text-xl font-normal text-indigo-200">USDC</span>
            </div>
            <div className="text-xs sm:text-sm text-indigo-200 font-medium mt-1">
              ~₹{(Number(totalPaidMicro) / 1_000_000 * INDICATIVE_USD_TO_INR_RATE).toLocaleString("en-IN", { maximumFractionDigits: 0 })} INR indicative
            </div>
          </div>

          {/* Awaiting and Overdue Chips */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-white/15">
            {/* Awaiting Chip */}
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white text-xs font-medium">
              <Clock className="w-3.5 h-3.5 text-indigo-200" />
              <span>
                {t("dashboard.totalOutstanding")}: <strong className="font-semibold">{formatUsdc(totalOutstandingMicro)} USDC</strong>
              </span>
            </div>

            {/* Overdue Chip */}
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white text-xs font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-amber-300" />
              <span>
                {t("dashboard.totalOverdue")}: <strong className="font-semibold">{totalOverdueCount}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Invoices Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#161A3A]">
            {t("dashboard.recentInvoices")}
          </h2>
          {invoices.length > 0 && (
            <Link
              href="/app/invoices"
              className="text-xs font-semibold text-[#4338CA] hover:text-[#2E259B] flex items-center gap-1 transition-colors min-h-[44px] items-center"
            >
              <span>{t("dashboard.viewAll")}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-[#5B6190] text-xs">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="p-10 rounded-[24px] bg-white border border-dashed border-[#E6E9F5] shadow-[0_2px_8px_rgba(40,50,120,0.08)] text-center flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-[20px] bg-indigo-50 text-[#4338CA] flex items-center justify-center">
              <FileText className="w-7 h-7" />
            </div>
            <div className="text-sm font-bold text-[#161A3A]">
              {t("dashboard.noInvoicesTitle")}
            </div>
            <p className="text-xs text-[#4B517D] max-w-sm">
              {t("dashboard.noInvoicesDesc")}
            </p>
            <Link
              href="/app/invoices/new"
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 min-h-[48px] rounded-[18px] bg-[#FF6B57] hover:bg-[#E85542] text-white font-semibold text-xs shadow-[0_4px_14px_rgba(255,107,87,0.35)] transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t("dashboard.createFirstInvoice")}</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="p-5 rounded-[22px] bg-white border border-[#E6E9F5] shadow-[0_2px_8px_rgba(40,50,120,0.08)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-[0_4px_16px_rgba(40,50,120,0.12)] transition-shadow"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-[14px] bg-[#F2F4FB] text-[#4338CA] flex items-center justify-center text-xs font-bold shrink-0">
                    {inv.invoiceNumber.replace("INV-", "#")}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/app/invoices/${inv.id}`}
                        className="text-xs sm:text-sm font-bold text-[#161A3A] hover:text-[#4338CA] transition-colors"
                      >
                        {inv.title}
                      </Link>
                      {getStatusBadge(inv.status)}
                    </div>
                    <div className="text-[11px] text-[#5B6190] mt-0.5">
                      {inv.clientName ? `${inv.clientName} • ` : ""}Due: {formatUnambiguousDate(inv.dueDate, lang)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-[#E6E9F5]">
                  <div className="text-left sm:text-right">
                    <div className="text-xs sm:text-sm font-bold text-[#161A3A]">
                      {formatUsdc(BigInt(inv.amountUsdc))} USDC
                    </div>
                    <div className="text-[10px] text-[#5B6190]">
                      ~₹{(Number(inv.amountUsdc) / 1_000_000 * INDICATIVE_USD_TO_INR_RATE).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopyLink(inv.publicId, inv.id)}
                      title={t("invoiceDetail.copyLink")}
                      className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[14px] border border-[#E6E9F5] text-[#4B517D] hover:bg-[#F2F4FB] transition-colors cursor-pointer"
                    >
                      {copiedId === inv.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <Link
                      href={`/app/invoices/${inv.id}`}
                      className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[14px] border border-[#E6E9F5] text-[#4B517D] hover:bg-[#F2F4FB] transition-colors"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
