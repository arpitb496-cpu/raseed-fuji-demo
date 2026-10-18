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
    <div className="space-y-6 pt-6 lg:pt-0 max-w-[1080px] mx-auto">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#161A3A]">
            {t("invoices.allInvoices")}
          </h1>
          <p className="text-xs text-[#5B6190] mt-1 font-medium">
            Manage your peer-to-peer invoices, payment links, and settlement receipts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/invoices/export"
            download="cryptodao_invoices.csv"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-[16px] bg-white border border-[#E6E9F5] text-xs font-semibold text-[#4B517D] hover:bg-[#F2F4FB] transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-[#5B6190]" />
            <span>{t("invoices.exportCsv")}</span>
          </a>
          <Link
            href="/app/invoices/new"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-[16px] bg-[#4338CA] hover:bg-[#2E259B] text-white font-semibold text-xs shadow-xs transition-colors shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t("invoices.newInvoice")}</span>
          </Link>
        </div>
      </div>

      {/* Quick Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-none">
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
              className={`px-4 py-2 min-h-[44px] rounded-full font-semibold transition-all shrink-0 text-xs cursor-pointer ${
                isActive
                  ? "bg-[#4338CA] text-white shadow-xs"
                  : "bg-white border border-[#E6E9F5] text-[#4B517D] hover:bg-[#F2F4FB]"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Filters & Search - Big Rounded Inputs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#5B6190]" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t("invoices.searchPlaceholder")}
            className="w-full pl-11 pr-4 py-3 min-h-[48px] text-xs rounded-[18px] bg-white border border-[#E6E9F5] text-[#161A3A] placeholder-[#5B6190] focus:outline-none focus:ring-2 focus:ring-[#4338CA] shadow-[0_2px_8px_rgba(40,50,120,0.04)]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-3 min-h-[48px] text-xs rounded-[18px] bg-white border border-[#E6E9F5] text-[#161A3A] font-medium focus:outline-none focus:ring-2 focus:ring-[#4338CA] shadow-[0_2px_8px_rgba(40,50,120,0.04)] cursor-pointer"
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
      <div className="bg-white rounded-[24px] border border-[#E6E9F5] overflow-hidden shadow-[0_2px_8px_rgba(40,50,120,0.08)]">
        {isLoading ? (
          <div className="p-16 text-center text-xs text-[#5B6190]">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center gap-2">
            <FileSpreadsheet className="w-10 h-10 text-[#5B6190]" />
            <div className="text-sm font-bold text-[#161A3A]">
              {t("invoices.emptySearch")}
            </div>
            <p className="text-xs text-[#4B517D]">
              Try adjusting your search query or status filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F2F4FB]/70 text-[#5B6190] border-b border-[#E6E9F5]">
                  <th className="py-3.5 px-5 font-semibold">{t("invoices.tableInvoice")}</th>
                  <th className="py-3.5 px-5 font-semibold">{t("invoices.tableClient")}</th>
                  <th className="py-3.5 px-5 font-semibold">{t("invoices.tableDue")}</th>
                  <th className="py-3.5 px-5 font-semibold text-right">{t("invoices.tableAmount")}</th>
                  <th className="py-3.5 px-5 font-semibold text-center">{t("invoices.tableStatus")}</th>
                  <th className="py-3.5 px-5 font-semibold text-right">{t("invoices.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E9F5]">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-[#F2F4FB]/50 transition-colors"
                  >
                    <td className="py-4 px-5 font-medium text-[#161A3A]">
                      <Link href={`/app/invoices/${inv.id}`} className="block group">
                        <div className="font-bold text-[#4338CA] group-hover:underline">
                          {inv.invoiceNumber}
                        </div>
                        <div className="text-[11px] text-[#5B6190] truncate max-w-[200px]">
                          {inv.title}
                        </div>
                      </Link>
                    </td>
                    <td className="py-4 px-5 text-[#4B517D]">
                      {inv.clientName || <span className="text-[#5B6190]">—</span>}
                    </td>
                    <td className="py-4 px-5 text-[#5B6190] whitespace-nowrap">
                      {formatUnambiguousDate(inv.dueDate, lang)}
                    </td>
                    <td className="py-4 px-5 font-bold text-[#161A3A] text-right whitespace-nowrap">
                      {formatUsdc(BigInt(inv.amountUsdc))} USDC
                    </td>
                    <td className="py-4 px-5 text-center whitespace-nowrap">
                      {getStatusBadge(inv.status)}
                    </td>
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleCopyLink(inv.publicId, inv.id)}
                          title={t("invoiceDetail.copyLink")}
                          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[12px] border border-[#E6E9F5] text-[#4B517D] hover:bg-[#F2F4FB] cursor-pointer transition-colors"
                        >
                          {copiedId === inv.id ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <Link
                          href={`/app/invoices/${inv.id}`}
                          title={t("invoices.view")}
                          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[12px] border border-[#E6E9F5] text-[#4B517D] hover:bg-[#F2F4FB] cursor-pointer transition-colors"
                        >
                          <Eye className="w-4 h-4" />
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
          <div className="p-4 border-t border-[#E6E9F5] flex items-center justify-between text-xs text-[#5B6190]">
            <div>
              {t("invoices.page")} {page} {t("invoices.of")} {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[12px] border border-[#E6E9F5] disabled:opacity-30 hover:bg-[#F2F4FB] cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[12px] border border-[#E6E9F5] disabled:opacity-30 hover:bg-[#F2F4FB] cursor-pointer transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
