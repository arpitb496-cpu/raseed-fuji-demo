"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { formatUsdc } from "@/lib/currency";
import { LanguageToggle } from "@/components/common/LanguageToggle";

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
  const { lang } = useI18n();
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

  // Compute metrics from real query data
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
    if (status === "PAID") {
      return {
        bg: "#D9F5E6",
        color: "#0B6B3A",
        label: lang === "en" ? "Paid" : "भुगतान संपन्न",
      };
    }
    if (status === "SENT" || status === "PARTIALLY_PAID") {
      return {
        bg: "#FFE9D1",
        color: "#9A4B00",
        label: lang === "en" ? "Awaiting payment" : "भुगतान की प्रतीक्षा",
      };
    }
    if (status === "EXPIRED") {
      return {
        bg: "#FEE2E2",
        color: "#991B1B",
        label: lang === "en" ? "Overdue" : "अतिदेय",
      };
    }
    return {
      bg: "#F2F4FB",
      color: "#5B6190",
      label: status === "DRAFT" ? (lang === "en" ? "Draft" : "ड्राफ्ट") : status,
    };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: "28px 20px 0 20px" }}>
      {/* Header Row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Indigo 14px Logo Tile with Check Icon */}
        <div style={{ width: 40, height: 40, borderRadius: 14, background: "#4338CA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12l5 5L20 7" />
          </svg>
        </div>
        {/* Brand Name */}
        <div style={{ fontWeight: 700, fontSize: 20, flexGrow: 1, letterSpacing: "-0.3px", color: "#161A3A" }}>
          CryptoDao
        </div>
        {/* Language Switch */}
        <LanguageToggle />
        {/* Fuji Testnet Pill */}
        <div style={{ fontSize: 12, fontWeight: 500, padding: "7px 12px", borderRadius: 999, background: "#FFFFFF", color: "#4B517D", boxShadow: "0 2px 8px rgba(40,50,120,0.08)", whiteSpace: "nowrap" }}>
          Fuji testnet
        </div>
      </div>

      {/* Muted line & 30px bold headline */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 15, color: "#4B517D" }}>
          {lang === "en" ? "Merchant overview" : "व्यापारी डैशबोर्ड"}
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.8px", lineHeight: 1.1, color: "#161A3A" }}>
          {lang === "en" ? (
            <>Get paid in USDC,<br />straight to your wallet.</>
          ) : (
            <>सीधे अपने वॉलेट में,<br />USDC भुगतान प्राप्त करें।</>
          )}
        </div>
      </div>

      {/* Big Indigo #4338CA Hero Card */}
      <div style={{ padding: "22px 20px", borderRadius: 28, background: "#4338CA", color: "#FFFFFF", boxShadow: "0 16px 32px rgba(67,56,202,0.28)" }}>
        <div style={{ fontSize: 14, color: "#D6D9FF" }}>
          {lang === "en" ? "Received" : "प्राप्त"}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 2 }}>
          <span style={{ fontSize: 48, fontWeight: 700, letterSpacing: "-1.5px" }}>
            {formatUsdc(totalPaidMicro)}
          </span>
          <span style={{ fontSize: 17, fontWeight: 500, color: "#D6D9FF" }}>USDC</span>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          {/* Awaiting Sub-tile */}
          <div style={{ flex: 1, padding: "10px 14px", borderRadius: 16, background: "rgba(255,255,255,0.16)" }}>
            <div style={{ fontSize: 12, color: "#E3E5FF" }}>
              {lang === "en" ? "Awaiting" : "प्रतीक्षित"}
            </div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>
              {formatUsdc(totalOutstandingMicro)}
            </div>
          </div>
          {/* Overdue Sub-tile */}
          <div style={{ flex: 1, padding: "10px 14px", borderRadius: 16, background: "rgba(255,255,255,0.16)" }}>
            <div style={{ fontSize: 12, color: "#E3E5FF" }}>
              {lang === "en" ? "Overdue" : "अतिदेय"}
            </div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>
              {totalOverdueCount}
            </div>
          </div>
        </div>
      </div>

      {/* Coral #FF6B57 "New invoice" + White "Pay link" buttons */}
      <div style={{ display: "flex", gap: 10 }}>
        <Link
          href="/app/invoices/new"
          style={{ flex: 1, minHeight: 52, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 18, background: "#FF6B57", color: "#FFFFFF", fontWeight: 700, fontSize: 15, textDecoration: "none" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {lang === "en" ? "New invoice" : "नया चालान"}
        </Link>
        <Link
          href="/app/invoices"
          style={{ minHeight: 52, padding: "0 20px", display: "flex", alignItems: "center", borderRadius: 18, background: "#FFFFFF", color: "#161A3A", fontWeight: 500, fontSize: 15, textDecoration: "none", boxShadow: "0 2px 8px rgba(40,50,120,0.08)" }}
        >
          {lang === "en" ? "Pay link" : "भुगतान लिंक"}
        </Link>
      </div>

      {/* Recent Invoices Heading ONCE */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 17, color: "#161A3A" }}>
          {lang === "en" ? "Recent invoices" : "हाल के चालान"}
        </div>

        {isLoading ? (
          <div style={{ padding: "24px 0", textAlign: "center", fontSize: 13, color: "#5B6190" }}>
            {lang === "en" ? "Loading invoices..." : "चालान लोड हो रहे हैं..."}
          </div>
        ) : invoices.length === 0 ? (
          <div style={{ padding: "24px 16px", borderRadius: 20, background: "#FFFFFF", boxShadow: "0 2px 8px rgba(40,50,120,0.06)", textAlign: "center", color: "#5B6190", fontSize: 14 }}>
            {lang === "en" ? "No invoices created yet." : "अभी तक कोई चालान नहीं बनाया गया है।"}
          </div>
        ) : (
          invoices.map((inv) => {
            const badge = getBadgeStyle(inv.status);
            const numMatch = inv.invoiceNumber.match(/\d+$/);
            const badgeNumber = numMatch ? `#${parseInt(numMatch[0], 10)}` : `#${inv.invoiceNumber.replace(/^INV-/, "")}`;

            return (
              <Link
                key={inv.id}
                href={`/app/invoices/${inv.id}`}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 20, background: "#FFFFFF", boxShadow: "0 2px 8px rgba(40,50,120,0.06)", textDecoration: "none", color: "inherit" }}
              >
                {/* Colored #N Badge */}
                <div style={{ minWidth: 42, height: 38, padding: "0 8px", borderRadius: 12, background: badge.bg, color: badge.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                  {badgeNumber}
                </div>
                {/* Title and Status */}
                <div style={{ flexGrow: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {inv.title}
                  </div>
                  <div style={{ fontSize: 12, color: badge.color }}>
                    {badge.label}
                  </div>
                </div>
                {/* Amount */}
                <div style={{ fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
                  {formatUsdc(BigInt(inv.amountUsdc))}
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Small Muted Legal Links at Bottom of Scroll Area */}
      <div style={{ paddingTop: 24, paddingBottom: 12, textAlign: "center", fontSize: 12, color: "#5B6190", display: "flex", justifyContent: "center", gap: 12 }}>
        <Link href="/legal/privacy" style={{ color: "#5B6190", textDecoration: "none" }}>Privacy</Link>
        <span>·</span>
        <Link href="/legal/terms" style={{ color: "#5B6190", textDecoration: "none" }}>Terms</Link>
        <span>·</span>
        <Link href="/security" style={{ color: "#5B6190", textDecoration: "none" }}>Security</Link>
        <span>·</span>
        <Link href="/about/how-it-works" style={{ color: "#5B6190", textDecoration: "none" }}>Docs</Link>
      </div>
    </div>
  );
}
