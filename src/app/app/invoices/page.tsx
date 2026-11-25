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
      PAID: { bg: "bg-[#a4d4c5] text-[#0a0a0a] border-[#0a0a0a]/15", text: t("status.paid") },
      SENT: { bg: "bg-[#ffb084] text-[#0a0a0a] border-[#0a0a0a]/15", text: t("status.sent") },
      PARTIALLY_PAID: { bg: "bg-[#e8b94a] text-[#0a0a0a] border-[#0a0a0a]/15", text: t("status.partiallyPaid") },
      DRAFT: { bg: "bg-[#ebe6d6] text-[#3a3a3a] border-[#e5e5e5]", text: t("status.draft") },
      EXPIRED: { bg: "bg-[#fee2e2] text-[#991b1b] border-[#fecaca]", text: t("status.expired") },
      CANCELLED: { bg: "bg-[#f5f0e0] text-[#6a6a6a] border-[#e5e5e5]", text: t("status.cancelled") },
    };
    const s = map[status] || { bg: "bg-[#f5f0e0] text-[#3a3a3a] border-[#e5e5e5]", text: status };
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-[9px] text-[11px] font-medium border ${s.bg}`}>
        {s.text}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#e5e5e5]">
        <div>
          <div className="nyc-kicker mb-1.5">Merchant Ledger</div>
          <h1 className="text-3xl sm:text-4xl font-display font-medium tracking-[-0.04em] text-[#0a0a0a]">
            {t("invoices.allInvoices")}
          </h1>
          <p className="text-sm text-[#3a3a3a] mt-1">
            Manage your peer-to-peer invoices, payment links, and settlement receipts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="/api/invoices/export"
            download="cryptodao_invoices.csv"
            className="clay-btn-secondary"
          >
            <Download className="w-4 h-4" />
            <span>{t("invoices.exportCsv")}</span>
          </a>
          <Link
            href="/app/invoices/new"
            className="clay-btn-primary"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t("invoices.newInvoice")}</span>
          </Link>
        </div>
      </div>

      {/* Filter Chips (matches .wk-tabs on ai.nexgendigital.tech) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
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
              className={`px-4 min-h-[40px] rounded-[12px] font-medium transition-all shrink-0 text-sm cursor-pointer border ${
                isActive
                  ? "bg-[#0a0a0a] text-[#fffaf0] border-[#0a0a0a]"
                  : "bg-[#fffaf0] border-[#e2ddd0] text-[#3a3a3a] hover:bg-[#f5f0e0] hover:text-[#0a0a0a]"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Search & Select */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#6a6a6a]" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t("invoices.searchPlaceholder")}
            className="clay-input !pl-11"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="clay-input sm:w-52 cursor-pointer"
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

      {/* Table Container */}
      <div className="bg-[#faf5e8] rounded-[24px] border border-[#e5e5e5] overflow-hidden shadow-[0_24px_48px_-36px_rgba(10,10,10,0.18)]">
        {isLoading ? (
          <div className="p-16 text-center text-xs text-[#6a6a6a]">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center gap-2">
            <FileSpreadsheet className="w-10 h-10 text-[#6a6a6a]" />
            <div className="text-base font-display font-medium text-[#0a0a0a]">
              {t("invoices.emptySearch")}
            </div>
            <p className="text-xs text-[#3a3a3a]">
              Try adjusting your search query or status filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-[#fffaf0]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#f5f0e0] text-[#3a3a3a] border-b border-[#e5e5e5]">
                  <th className="py-3.5 px-5 font-medium">{t("invoices.tableInvoice")}</th>
                  <th className="py-3.5 px-5 font-medium">{t("invoices.tableClient")}</th>
                  <th className="py-3.5 px-5 font-medium">{t("invoices.tableDue")}</th>
                  <th className="py-3.5 px-5 font-medium text-right">{t("invoices.tableAmount")}</th>
                  <th className="py-3.5 px-5 font-medium text-center">{t("invoices.tableStatus")}</th>
                  <th className="py-3.5 px-5 font-medium text-right">{t("invoices.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5]">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-[#faf5e8] transition-colors"
                  >
                    <td className="py-4 px-5 font-medium text-[#0a0a0a]">
                      <Link href={`/app/invoices/${inv.id}`} className="block group">
                        <div className="font-mono font-medium text-[#0a0a0a] group-hover:text-[#b64d31] group-hover:underline">
                          {inv.invoiceNumber}
                        </div>
                        <div className="text-xs text-[#6a6a6a] truncate max-w-[220px] mt-0.5">
                          {inv.title}
                        </div>
                      </Link>
                    </td>
                    <td className="py-4 px-5 text-[#3a3a3a]">
                      {inv.clientName || <span className="text-[#9a9a9a]">—</span>}
                    </td>
                    <td className="py-4 px-5 text-[#6a6a6a] whitespace-nowrap">
                      {formatUnambiguousDate(inv.dueDate, lang)}
                    </td>
                    <td className="py-4 px-5 font-mono font-medium text-[#0a0a0a] text-right whitespace-nowrap">
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
                          className="p-2 min-h-[42px] min-w-[42px] flex items-center justify-center rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-[#3a3a3a] hover:bg-[#f5f0e0] hover:border-[#0a0a0a] cursor-pointer transition-colors"
                        >
                          {copiedId === inv.id ? (
                            <Check className="w-4 h-4 text-[#173f32]" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <Link
                          href={`/app/invoices/${inv.id}`}
                          title={t("invoices.view")}
                          className="p-2 min-h-[42px] min-w-[42px] flex items-center justify-center rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-[#3a3a3a] hover:bg-[#f5f0e0] hover:border-[#0a0a0a] cursor-pointer transition-colors"
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
          <div className="p-4 border-t border-[#e5e5e5] bg-[#faf5e8] flex items-center justify-between text-xs text-[#6a6a6a]">
            <div>
              {t("invoices.page")} {page} {t("invoices.of")} {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-2 min-h-[42px] min-w-[42px] flex items-center justify-center rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] disabled:opacity-30 hover:bg-[#ebe6d6] cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-2 min-h-[42px] min-w-[42px] flex items-center justify-center rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] disabled:opacity-30 hover:bg-[#ebe6d6] cursor-pointer transition-colors"
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
