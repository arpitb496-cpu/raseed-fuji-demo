"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { formatUsdc } from "@/lib/currency";
import { formatUnambiguousDate } from "@/lib/utils/date";
import {
  PlusCircle,
  Search,
  Download,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileSpreadsheet,
} from "lucide-react";

interface InvoiceItem {
  id: string;
  publicId: string;
  invoiceNumber: string;
  title: string;
  clientName: string | null;
  amountUsdc: string;
  status: string;
  dueDate: string;
  createdAt: string;
}

export default function InvoicesListPage() {
  const { t, lang } = useI18n();
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadInvoices() {
      try {
        setIsLoading(true);
        const query = new URLSearchParams({
          page: page.toString(),
          limit: "10",
          search,
          status: statusFilter,
        });
        const res = await fetch(`/api/invoices?${query.toString()}`);
        const data = await res.json();
        if (active && data.invoices) {
          setInvoices(data.invoices);
          setTotalPages(data.totalPages || 1);
        }
      } catch (err) {
        console.error("Failed to fetch invoices:", err);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    loadInvoices();
    return () => {
      active = false;
    };
  }, [page, search, statusFilter]);

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
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t("invoices.allInvoices")}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage your peer-to-peer invoices, payment links, and settlement receipts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/invoices/export"
            download="cryptodao_invoices.csv"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{t("invoices.exportCsv")}</span>
          </a>
          <Link
            href="/app/invoices/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs transition-colors shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t("invoices.newInvoice")}</span>
          </Link>
        </div>
      </div>

      {/* Quick Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {[
          { key: "ALL", label: t("invoices.allStatus") },
          { key: "DRAFT", label: t("status.draft") },
          { key: "SENT", label: t("status.sent") },
          { key: "PARTIALLY_PAID", label: t("status.partiallyPaid") },
          { key: "PAID", label: t("status.paid") },
          { key: "EXPIRED", label: t("status.expired") },
          { key: "CANCELLED", label: t("status.cancelled") },
        ].map((chip) => {
          const isActive = statusFilter === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => {
                setStatusFilter(chip.key);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors shrink-0 text-xs ${
                isActive
                  ? "bg-teal-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t("invoices.searchPlaceholder")}
            className="w-full pl-9.5 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
        >
          <option value="ALL">{t("invoices.allStatus")}</option>
          <option value="DRAFT">{t("status.draft")}</option>
          <option value="SENT">{t("status.sent")}</option>
          <option value="PARTIALLY_PAID">{t("status.partiallyPaid")}</option>
          <option value="PAID">{t("status.paid")}</option>
          <option value="EXPIRED">{t("status.expired")}</option>
          <option value="CANCELLED">{t("status.cancelled")}</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-16 text-center text-xs text-slate-400">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center gap-2">
            <FileSpreadsheet className="w-8 h-8 text-slate-400" />
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {t("invoices.emptySearch")}
            </div>
            <p className="text-xs text-slate-500">
              Try adjusting your search query or status filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-4 font-semibold">{t("invoices.tableInvoice")}</th>
                  <th className="py-3 px-4 font-semibold">{t("invoices.tableClient")}</th>
                  <th className="py-3 px-4 font-semibold">{t("invoices.tableDue")}</th>
                  <th className="py-3 px-4 font-semibold text-right">{t("invoices.tableAmount")}</th>
                  <th className="py-3 px-4 font-semibold text-center">{t("invoices.tableStatus")}</th>
                  <th className="py-3 px-4 font-semibold text-right">{t("invoices.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                      <Link href={`/app/invoices/${inv.id}`} className="block group">
                        <div className="font-semibold text-teal-700 dark:text-teal-400 group-hover:underline">
                          {inv.invoiceNumber}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                          {inv.title}
                        </div>
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {inv.clientName || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {formatUnambiguousDate(inv.dueDate, lang)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white text-right whitespace-nowrap">
                      {formatUsdc(BigInt(inv.amountUsdc))} USDC
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {getStatusBadge(inv.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleCopyLink(inv.publicId, inv.id)}
                          title={t("invoiceDetail.copyLink")}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          {copiedId === inv.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <Link
                          href={`/app/invoices/${inv.id}`}
                          title={t("invoices.view")}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <div>
              {t("invoices.page")} {page} {t("invoices.of")} {totalPages}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
