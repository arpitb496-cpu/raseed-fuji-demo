"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { MIN_INVOICE_AMOUNT_FLOAT } from "@/config/constants";
import { useInrRate } from "@/hooks/useInrRate";
import { formatInrReferenceLabel } from "@/lib/rate";
import { Trash2, ArrowLeft, Loader2, Sparkles, AlertCircle, Plus } from "lucide-react";

interface FormLineItem {
  description: string;
  quantity: number;
  unitPriceUsdc: number;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const { rate: inrRate, asOf: inrAsOf } = useInrRate();

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

  const totalUsdc = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPriceUsdc) || 0),
    0
  );

  const approxInr =
    inrRate !== null
      ? (totalUsdc * inrRate).toLocaleString("en-IN", {
          maximumFractionDigits: 2,
        })
      : null;

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
    <div className="max-w-[740px] mx-auto space-y-6">
      <Link
        href="/app/invoices"
        className="inline-flex items-center gap-1.5 text-xs text-[#0a0a0a] hover:text-[#b64d31] font-medium min-h-[44px]"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> {t("invoiceDetail.backToList")}
      </Link>

      <div className="pb-4 border-b border-[#e5e5e5]">
        <div className="nyc-kicker mb-1.5">Create Payment Link</div>
        <h1 className="text-3xl sm:text-4xl font-display font-medium tracking-[-0.04em] text-[#0a0a0a]">
          {t("newInvoice.heading")}
        </h1>
        <p className="text-sm text-[#3a3a3a] mt-1">
          {t("newInvoice.subheading")}
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-[14px] bg-[#fee2e2] border border-[#fecaca] text-[#991b1b] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Details Card */}
        <div className="p-6 sm:p-8 rounded-[24px] bg-[#faf5e8] border border-[#0a0a0a] space-y-5">
          <div>
            <label className="block text-xs font-medium text-[#0a0a0a] mb-1.5">
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
              className="clay-input"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#0a0a0a] mb-1.5">
                {t("newInvoice.dueDateLabel")} *
              </label>
              <input
                id="invoice-due-date-input"
                data-testid="invoice-due-date-input"
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="clay-input"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#0a0a0a] mb-1.5">
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
                className="clay-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#0a0a0a] mb-1.5">
              {t("newInvoice.clientEmailLabel")}
            </label>
            <input
              id="invoice-client-email-input"
              data-testid="invoice-client-email-input"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder={t("newInvoice.clientEmailPlaceholder")}
              className="clay-input"
            />
          </div>
        </div>

        {/* Line Items Section */}
        <div className="space-y-3">
          <h2 className="text-base font-display font-medium text-[#0a0a0a]">
            {t("newInvoice.lineItems")}
          </h2>

          <div className="space-y-3">
            {items.map((item, idx) => {
              const lineTotal = (item.quantity || 0) * (item.unitPriceUsdc || 0);
              return (
                <div
                  key={idx}
                  className="p-4 sm:p-5 rounded-[20px] bg-[#f5f0e0] border border-[#e5e5e5] space-y-3"
                >
                  <div>
                    <label className="block text-xs font-medium text-[#3a3a3a] mb-1">
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
                      className="clay-input"
                    />
                  </div>

                  <div className="flex items-end gap-2 sm:gap-3">
                    <div className="w-16 sm:w-20 shrink-0">
                      <label className="block text-xs font-medium text-[#3a3a3a] mb-1">
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
                        className="clay-input !px-2 text-center"
                      />
                    </div>

                    <div className="flex-1 min-w-[90px]">
                      <label className="block text-xs font-medium text-[#3a3a3a] mb-1">
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
                          className="clay-input !pr-14 text-right font-mono"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-[#6a6a6a]">
                          USDC
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 text-right min-w-[74px]">
                      <div className="text-xs font-medium text-[#3a3a3a] mb-1">
                        {t("newInvoice.itemTotal")}
                      </div>
                      <div className="h-[44px] flex items-center justify-end font-mono font-medium text-xs text-[#0a0a0a]">
                        {lineTotal.toFixed(2)} USDC
                      </div>
                    </div>

                    <div className="shrink-0">
                      <button
                        type="button"
                        disabled={items.length <= 1}
                        onClick={() => handleRemoveItem(idx)}
                        aria-label="Delete line item"
                        className="w-11 h-11 min-h-[44px] min-w-[44px] shrink-0 flex items-center justify-center rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-[#6a6a6a] hover:text-[#991b1b] hover:border-[#991b1b] disabled:opacity-30 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className="clay-btn-secondary w-full"
          >
            <Plus className="w-4 h-4" />
            <span>{t("newInvoice.addItem")}</span>
          </button>

          {/* Total Calculation Card */}
          <div className="p-5 rounded-[20px] bg-[#1a3a3a] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-xs text-[#a4d4c5]">
              {t("newInvoice.minUsdcNotice")}
            </div>
            <div className="text-right">
              <div className="text-2xl font-light font-mono tabular-nums text-white">
                {totalUsdc.toFixed(2)} <span className="text-xs font-normal text-[#a4d4c5]">USDC</span>
              </div>
              {approxInr !== null && inrRate !== null && inrAsOf !== null && (
                <div className="text-[11px] text-[#f0f0f0] mt-0.5">
                  ~₹{approxInr} INR · {formatInrReferenceLabel(inrRate, inrAsOf, lang)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes Card */}
        <div className="p-6 sm:p-8 rounded-[24px] bg-[#faf5e8] border border-[#e5e5e5] space-y-2">
          <label className="block text-xs font-medium text-[#0a0a0a]">
            {t("newInvoice.notesLabel")}
          </label>
          <p className="text-xs text-[#6a6a6a]">
            {t("newInvoice.notesSubtext")}
          </p>
          <textarea
            rows={3}
            maxLength={1000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("newInvoice.notesPlaceholder")}
            className="clay-input"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            id="create-invoice-submit-btn"
            type="submit"
            disabled={isSubmitting || totalUsdc < MIN_INVOICE_AMOUNT_FLOAT}
            className="clay-btn-primary"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t("newInvoice.creating")}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#ffb084]" />
                <span>{t("newInvoice.createButton")}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
