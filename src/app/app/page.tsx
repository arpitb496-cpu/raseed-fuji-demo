"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { formatUsdc } from "@/lib/currency";
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
  const { t } = useI18n();
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
      PAID: { bg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800", text: t("status.paid") },
      SENT: { bg: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800", text: t("status.sent") },
      PARTIALLY_PAID: { bg: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800", text: t("status.partiallyPaid") },
      DRAFT: { bg: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700", text: t("status.draft") },
      EXPIRED: { bg: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800", text: t("status.expired") },
      CANCELLED: { bg: "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200", text: t("status.cancelled") },
    };
    const s = map[status] || { bg: "bg-slate-100 text-slate-700 border-slate-200", text: status };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${s.bg}`}>
        {s.text}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t("dashboard.title")}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t("dashboard.subtitle")}
          </p>
        </div>
        <Link
          href="/app/invoices/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t("invoices.newInvoice")}</span>
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Paid */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">{t("dashboard.totalPaid")}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {formatUsdc(totalPaidMicro)} <span className="text-xs font-normal text-slate-500">USDC</span>
          </div>
          <div className="text-[11px] text-slate-400">
            ~₹{(Number(totalPaidMicro) / 1_000_000 * INDICATIVE_USD_TO_INR_RATE).toLocaleString("en-IN", { maximumFractionDigits: 0 })} INR
          </div>
        </div>

        {/* Total Outstanding */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">{t("dashboard.totalOutstanding")}</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {formatUsdc(totalOutstandingMicro)} <span className="text-xs font-normal text-slate-500">USDC</span>
          </div>
          <div className="text-[11px] text-slate-400">
            ~₹{(Number(totalOutstandingMicro) / 1_000_000 * INDICATIVE_USD_TO_INR_RATE).toLocaleString("en-IN", { maximumFractionDigits: 0 })} INR
          </div>
        </div>

        {/* Overdue Count */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">{t("dashboard.totalOverdue")}</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {totalOverdueCount} <span className="text-xs font-normal text-slate-500">Invoices</span>
          </div>
          <div className="text-[11px] text-slate-400">Requires follow-up</div>
        </div>
      </div>

      {/* Recent Invoices Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t("dashboard.recentInvoices")}
          </h2>
          {invoices.length > 0 && (
            <Link
              href="/app/invoices"
              className="text-xs font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              <span>{t("dashboard.viewAll")}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {t("dashboard.noInvoicesTitle")}
            </div>
            <p className="text-xs text-slate-500 max-w-sm">
              {t("dashboard.noInvoicesDesc")}
            </p>
            <Link
              href="/app/invoices/new"
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t("dashboard.createFirstInvoice")}</span>
            </Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 text-xs font-semibold">
                      {inv.invoiceNumber.replace("INV-", "#")}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/app/invoices/${inv.id}`}
                          className="text-xs font-semibold text-slate-900 dark:text-white hover:text-teal-600"
                        >
                          {inv.title}
                        </Link>
                        {getStatusBadge(inv.status)}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {inv.clientName ? `${inv.clientName} • ` : ""}Due: {new Date(inv.dueDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {formatUsdc(BigInt(inv.amountUsdc))} USDC
                      </div>
                      <div className="text-[10px] text-slate-400">
                        ~₹{(Number(inv.amountUsdc) / 1_000_000 * INDICATIVE_USD_TO_INR_RATE).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopyLink(inv.publicId, inv.id)}
                        title={t("invoiceDetail.copyLink")}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        {copiedId === inv.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <Link
                        href={`/app/invoices/${inv.id}`}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
