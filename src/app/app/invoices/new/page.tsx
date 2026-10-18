"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { MIN_INVOICE_AMOUNT_FLOAT, INDICATIVE_USD_TO_INR_RATE } from "@/config/constants";
import { Trash2, ArrowLeft, Loader2, Sparkles, AlertCircle, Plus } from "lucide-react";

interface FormLineItem {
  description: string;
  quantity: number;
  unitPriceUsdc: number;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const { t } = useI18n();

  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [dueDate, setDueDate] = useState(() =>
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<FormLineItem[]>([
    { description: "", quantity: 1, unitPriceUsdc: 100 },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live calculation
  const totalUsdc = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPriceUsdc) || 0),
    0
  );

  const approxInr = (totalUsdc * INDICATIVE_USD_TO_INR_RATE).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

  const handleAddItem = () => {
    setItems([...items, { description: "", quantity: 1, unitPriceUsdc: 50 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof FormLineItem, val: string | number) => {
    const updated = [...items];
    if (field === "quantity") {
      updated[index].quantity = Math.max(1, parseInt(String(val), 10) || 1);
    } else if (field === "unitPriceUsdc") {
      updated[index].unitPriceUsdc = Math.max(0, parseFloat(String(val)) || 0);
    } else {
      updated[index].description = String(val);
    }
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (totalUsdc < MIN_INVOICE_AMOUNT_FLOAT) {
      setError(t("newInvoice.minUsdcNotice"));
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          clientName: clientName.trim() || undefined,
          clientEmail: clientEmail.trim() || undefined,
          dueDate,
          notes: notes.trim() || undefined,
          items,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create invoice.");
      }

      router.push(`/app/invoices/${data.invoice.id}`);
    } catch (err: unknown) {
      console.error("Create invoice error:", err);
      setError(err instanceof Error ? err.message : "Failed to create invoice.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[720px] mx-auto space-y-6">
      <Link
        href="/app/invoices"
        className="inline-flex items-center gap-1.5 text-xs text-[#4338CA] hover:text-[#2E259B] font-semibold min-h-[44px]"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> {t("invoiceDetail.backToList")}
      </Link>

      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#161A3A]">
          {t("newInvoice.heading")}
        </h1>
        <p className="text-xs text-[#5B6190] mt-1 font-medium">
          {t("newInvoice.subheading")}
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-[18px] bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Details Card */}
        <div className="p-6 sm:p-8 rounded-[24px] bg-white border border-[#E6E9F5] space-y-5 shadow-[0_2px_8px_rgba(40,50,120,0.06)]">
          <div>
            <label className="block text-xs font-semibold text-[#161A3A] mb-1.5">
              {t("newInvoice.titleLabel")} *
            </label>
            <input
              id="invoice-title-input"
              data-testid="invoice-title-input"
              type="text"
              required
              minLength={2}
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("newInvoice.titlePlaceholder")}
              className="w-full px-4 py-3 min-h-[48px] text-xs rounded-[16px] bg-[#F2F4FB]/50 border border-[#E6E9F5] text-[#161A3A] placeholder-[#5B6190] focus:outline-none focus:ring-2 focus:ring-[#4338CA] focus:ring-offset-1 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#161A3A] mb-1.5">
              {t("newInvoice.dueDateLabel")} *
            </label>
            <input
              id="invoice-due-date-input"
              data-testid="invoice-due-date-input"
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-3 min-h-[48px] text-xs rounded-[16px] bg-[#F2F4FB]/50 border border-[#E6E9F5] text-[#161A3A] focus:outline-none focus:ring-2 focus:ring-[#4338CA] focus:ring-offset-1 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#161A3A] mb-1.5">
              {t("newInvoice.clientNameLabel")}
            </label>
            <input
              id="invoice-client-name-input"
              data-testid="invoice-client-name-input"
              type="text"
              maxLength={100}
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder={t("newInvoice.clientNamePlaceholder")}
              className="w-full px-4 py-3 min-h-[48px] text-xs rounded-[16px] bg-[#F2F4FB]/50 border border-[#E6E9F5] text-[#161A3A] placeholder-[#5B6190] focus:outline-none focus:ring-2 focus:ring-[#4338CA] focus:ring-offset-1 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#161A3A] mb-1.5">
              {t("newInvoice.clientEmailLabel")}
            </label>
            <input
              id="invoice-client-email-input"
              data-testid="invoice-client-email-input"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder={t("newInvoice.clientEmailPlaceholder")}
              className="w-full px-4 py-3 min-h-[48px] text-xs rounded-[16px] bg-[#F2F4FB]/50 border border-[#E6E9F5] text-[#161A3A] placeholder-[#5B6190] focus:outline-none focus:ring-2 focus:ring-[#4338CA] focus:ring-offset-1 transition-all"
            />
          </div>
        </div>

        {/* Line Items Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#161A3A]">
              {t("newInvoice.lineItems")}
            </h2>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => {
              const lineTotal = (item.quantity || 0) * (item.unitPriceUsdc || 0);
              return (
                <div
                  key={idx}
                  className="p-3.5 sm:p-5 rounded-[20px] bg-white border border-[#E6E9F5] space-y-3 shadow-[0_2px_8px_rgba(40,50,120,0.06)]"
                >
                  {/* Row 1: Description input full width */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5B6190] mb-1">
                      {t("newInvoice.itemDesc")}
                    </label>
                    <input
                      id={`item-desc-${idx}`}
                      data-testid={`item-desc-${idx}`}
                      type="text"
                      required
                      placeholder={t("newInvoice.itemDescPlaceholder")}
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                      className="w-full px-4 py-2.5 min-h-[48px] text-xs rounded-[14px] bg-[#F2F4FB]/50 border border-[#E6E9F5] text-[#161A3A] placeholder-[#5B6190] focus:outline-none focus:ring-2 focus:ring-[#4338CA] focus:ring-offset-1"
                    />
                  </div>

                  {/* Row 2: Qty, Unit price (USDC), line total, delete button (44px) */}
                  <div className="flex items-end gap-2 sm:gap-3">
                    {/* Qty */}
                    <div className="w-16 sm:w-20 shrink-0">
                      <label className="block text-[11px] font-semibold text-[#5B6190] mb-1">
                        {t("newInvoice.itemQty")}
                      </label>
                      <input
                        id={`item-qty-${idx}`}
                        data-testid={`item-qty-${idx}`}
                        type="number"
                        required
                        min={1}
                        max={10000}
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                        className="w-full px-2 py-2 min-h-[44px] text-xs text-center rounded-[12px] bg-[#F2F4FB]/50 border border-[#E6E9F5] text-[#161A3A] focus:outline-none focus:ring-2 focus:ring-[#4338CA] focus:ring-offset-1"
                      />
                    </div>

                    {/* Unit price (USDC) */}
                    <div className="flex-1 min-w-[76px] sm:min-w-[100px]">
                      <label className="block text-[11px] font-semibold text-[#5B6190] mb-1">
                        {t("newInvoice.itemPrice")}
                      </label>
                      <div className="relative">
                        <input
                          id={`item-price-${idx}`}
                          data-testid={`item-price-${idx}`}
                          type="number"
                          step="0.01"
                          required
                          min={0.01}
                          value={item.unitPriceUsdc}
                          onChange={(e) => handleItemChange(idx, "unitPriceUsdc", e.target.value)}
                          className="w-full pl-2.5 sm:pl-3 pr-9 sm:pr-10 py-2 min-h-[44px] text-xs text-right rounded-[12px] bg-[#F2F4FB]/50 border border-[#E6E9F5] text-[#161A3A] focus:outline-none focus:ring-2 focus:ring-[#4338CA] focus:ring-offset-1"
                        />
                        <span className="absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-[#5B6190]">
                          USDC
                        </span>
                      </div>
                    </div>

                    {/* Line total */}
                    <div className="shrink-0 text-right min-w-[64px] sm:min-w-[70px]">
                      <div className="text-[11px] font-semibold text-[#5B6190] mb-1">
                        {t("newInvoice.itemTotal")}
                      </div>
                      <div className="h-[44px] flex items-center justify-end font-bold text-xs text-[#161A3A]">
                        {lineTotal.toFixed(2)} USDC
                      </div>
                    </div>

                    {/* Delete button (44px) */}
                    <div className="shrink-0">
                      <button
                        type="button"
                        disabled={items.length <= 1}
                        onClick={() => handleRemoveItem(idx)}
                        aria-label="Delete line item"
                        className="w-11 h-11 min-h-[44px] min-w-[44px] shrink-0 flex items-center justify-center rounded-[12px] border border-[#E6E9F5] text-[#5B6190] hover:text-[#991B1B] hover:bg-rose-50 disabled:opacity-20 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* "+ + Add Line Item" -> ONE plus icon + text, full width outlined indigo button */}
          <button
            type="button"
            onClick={handleAddItem}
            className="w-full py-3 min-h-[48px] rounded-[16px] border border-[#4338CA] bg-white hover:bg-[#4338CA]/5 text-[#4338CA] font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>{t("newInvoice.addItem")}</span>
          </button>

          {/* Total Calculation Card */}
          <div className="p-4 sm:p-5 rounded-[20px] bg-white border border-[#E6E9F5] flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-[0_2px_8px_rgba(40,50,120,0.06)]">
            <div className="text-xs text-[#5B6190]">
              {t("newInvoice.minUsdcNotice")}
            </div>
            <div className="text-right">
              <div className="text-xl font-extrabold text-[#161A3A]">
                {totalUsdc.toFixed(2)} <span className="text-xs font-normal text-[#5B6190]">USDC</span>
              </div>
              <div className="text-[11px] text-[#5B6190]">
                ~₹{approxInr} INR indicative
              </div>
            </div>
          </div>
        </div>

        {/* Notes Card */}
        <div className="p-6 sm:p-8 rounded-[24px] bg-white border border-[#E6E9F5] space-y-2 shadow-[0_2px_8px_rgba(40,50,120,0.08)]">
          <label className="block text-xs font-semibold text-[#161A3A]">
            {t("newInvoice.notesLabel")}
          </label>
          <p className="text-[11px] text-[#5B6190]">
            {t("newInvoice.notesSubtext")}
          </p>
          <textarea
            rows={3}
            maxLength={1000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("newInvoice.notesPlaceholder")}
            className="w-full px-4 py-3 text-xs rounded-[16px] bg-[#F2F4FB]/50 border border-[#E6E9F5] text-[#161A3A] placeholder-[#5B6190] focus:outline-none focus:ring-2 focus:ring-[#4338CA] focus:ring-offset-1 transition-all"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            id="create-invoice-submit-btn"
            type="submit"
            disabled={isSubmitting || totalUsdc < MIN_INVOICE_AMOUNT_FLOAT}
            className="px-6 py-3.5 min-h-[48px] rounded-[18px] bg-[#4338CA] hover:bg-[#2E259B] text-white font-semibold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t("newInvoice.creating")}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{t("newInvoice.createButton")}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
