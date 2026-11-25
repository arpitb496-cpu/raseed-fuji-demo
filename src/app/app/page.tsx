"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { formatUsdc } from "@/lib/currency";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { ArrowRight, Plus, Check } from "lucide-react";

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

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/invoices?limit=10");
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

  const getBadgeStyle = (status: string) => {
    switch (status) {
      case "PAID":
        return {
          bg: "#a4d4c5",
          color: "#0a0a0a",
          label: t("status.paid"),
        };
      case "SENT":
      case "PARTIALLY_PAID":
        return {
          bg: "#ffb084",
          color: "#0a0a0a",
          label: status === "SENT" ? t("status.sent") : t("status.partiallyPaid"),
        };
      case "EXPIRED":
        return {
          bg: "#fee2e2",
          color: "#991b1b",
          label: t("status.expired"),
        };
      case "DRAFT":
        return {
          bg: "#ebe6d6",
          color: "#3a3a3a",
          label: t("status.draft"),
        };
      case "CANCELLED":
        return {
          bg: "#f5f0e0",
          color: "#6a6a6a",
          label: t("status.cancelled"),
        };
      default:
        return {
          bg: "#f5f0e0",
          color: "#3a3a3a",
          label: status,
        };
    }
  };

  return (
    <div className="space-y-8">
      {/* Mobile Header Row (hidden on desktop) */}
      <div className="lg:hidden flex items-center gap-2">
        <div className="w-9 h-9 rounded-[12px] bg-[#0a0a0a] flex items-center justify-center shrink-0 text-[#fffaf0]">
          <Check className="w-4 h-4 stroke-[2.5]" />
        </div>
        <div className="font-medium text-lg flex-1 min-w-0 tracking-[-0.03em] text-[#0a0a0a]">
          CryptoDao
        </div>
        <LanguageToggle />
        <div className="text-xs font-medium px-3 py-1.5 rounded-full bg-[#ffb084] text-[#0a0a0a] whitespace-nowrap shrink-0">
          Fuji testnet
        </div>
      </div>

      {/* Editorial Heading */}
      <div className="space-y-2 pb-6 border-b border-[#e5e5e5]">
        <div className="nyc-kicker">
          {lang === "en" ? "Merchant overview" : "व्यापारी डैशबोर्ड"}
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-display font-medium tracking-[-0.04em] text-[#0a0a0a] leading-[1.06]">
          {lang === "en" ? (
            <>
              Get paid in USDC,{" "}
              <span className="font-editorial nyc-accent-terra">
                straight to your wallet.
              </span>
            </>
          ) : (
            <>
              सीधे अपने वॉलेट में,{" "}
              <span className="font-editorial nyc-accent-terra">
                USDC भुगतान प्राप्त करें।
              </span>
            </>
          )}
        </h1>
      </div>

      {/* Two columns on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Deep Forest Teal Hero Card + Primary/Secondary CTAs */}
        <div className="lg:col-span-7 space-y-4">
          <div className="clay-card-teal !p-6 sm:!p-8 space-y-5">
            <div className="flex items-center justify-between">
              <div className="nyc-kicker !text-[#a4d4c5]">
                {lang === "en" ? "Received" : "प्राप्त"}
              </div>
              <span className="px-2.5 py-1 rounded-full bg-white/10 text-[#a4d4c5] text-[11px] font-mono">
                USDC · Fuji
              </span>
            </div>

            <div className="flex items-baseline gap-2.5">
              <span className="text-4xl sm:text-5xl font-light tracking-[-0.05em] tabular-nums text-white">
                {formatUsdc(totalPaidMicro)}
              </span>
              <span className="text-base font-medium text-[#a4d4c5]">USDC</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-[14px] bg-white/10 border border-white/10">
                <div className="text-xs text-[#a4d4c5]">
                  {lang === "en" ? "Awaiting" : "प्रतीक्षित"}
                </div>
                <div className="text-lg font-medium text-white tabular-nums mt-0.5">
                  {formatUsdc(totalOutstandingMicro)}
                </div>
              </div>
              <div className="p-3.5 rounded-[14px] bg-white/10 border border-white/10">
                <div className="text-xs text-[#a4d4c5]">
                  {lang === "en" ? "Overdue" : "अतिदेय"}
                </div>
                <div className="text-lg font-medium text-white tabular-nums mt-0.5">
                  {totalOverdueCount}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/app/invoices/new" className="clay-btn-primary flex-1">
              <Plus className="w-4 h-4" />
              <span>{lang === "en" ? "New invoice" : "नया चालान"}</span>
            </Link>
            <Link href="/app/invoices" className="clay-btn-secondary">
              <span>{lang === "en" ? "Payment links" : "भुगतान लिंक"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Right Column: Recent Invoices */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-medium text-[#0a0a0a]">
              {lang === "en" ? "Recent invoices" : "हाल के चालान"}
            </h2>
            <Link
              href="/app/invoices"
              className="text-xs font-medium text-[#0a0a0a] hover:underline underline-offset-4"
            >
              {t("dashboard.viewAll")}
            </Link>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-xs text-[#6a6a6a]">
              {lang === "en" ? "Loading invoices..." : "चालान लोड हो रहे हैं..."}
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-6 rounded-[20px] bg-[#f5f0e0] border border-[#e5e5e5] text-center text-[#6a6a6a] text-sm">
              {lang === "en" ? "No invoices created yet." : "अभी तक कोई चालान नहीं बनाया गया है।"}
            </div>
          ) : (
            <div className="space-y-2.5">
              {invoices.map((inv) => {
                const badge = getBadgeStyle(inv.status);
                const numMatch = inv.invoiceNumber.match(/\d+$/);
                const badgeNumber = numMatch
                  ? `#${parseInt(numMatch[0], 10)}`
                  : `#${inv.invoiceNumber.replace(/^INV-/, "")}`;

                return (
                  <Link
                    key={inv.id}
                    href={`/app/invoices/${inv.id}`}
                    className="flex items-center gap-3 p-3.5 rounded-[18px] bg-[#f5f0e0] border border-[#e5e5e5] hover:border-[#0a0a0a] transition-colors text-[#0a0a0a]"
                  >
                    <div
                      style={{ background: badge.bg, color: badge.color }}
                      className="min-w-[44px] h-9 px-2 rounded-[10px] border border-[#0a0a0a]/10 flex items-center justify-center text-xs font-medium font-mono shrink-0"
                    >
                      {badgeNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate text-[#0a0a0a]">
                        {inv.title}
                      </div>
                      <div className="text-xs text-[#6a6a6a]">{badge.label}</div>
                    </div>
                    <div className="text-sm font-medium font-mono tabular-nums shrink-0 text-[#0a0a0a]">
                      {formatUsdc(BigInt(inv.amountUsdc))}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Links */}
      <div className="pt-6 border-t border-[#e5e5e5] text-center text-xs text-[#6a6a6a] flex justify-center gap-3">
        <Link href="/legal/privacy" className="hover:text-[#0a0a0a] hover:underline">Privacy</Link>
        <span>·</span>
        <Link href="/legal/terms" className="hover:text-[#0a0a0a] hover:underline">Terms</Link>
        <span>·</span>
        <Link href="/security" className="hover:text-[#0a0a0a] hover:underline">Security</Link>
        <span>·</span>
        <Link href="/about/how-it-works" className="hover:text-[#0a0a0a] hover:underline">Docs</Link>
      </div>
    </div>
  );
}
