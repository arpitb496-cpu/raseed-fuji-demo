"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { MIN_INVOICE_AMOUNT_FLOAT, INDICATIVE_USD_TO_INR_RATE } from "@/config/constants";
import { Trash2, ArrowLeft, Loader2, Sparkles, AlertCircle } from "lucide-react";

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
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/app/invoices"
        className="inline-flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-medium"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> {t("invoiceDetail.backToList")}
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t("newInvoice.heading")}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {t("newInvoice.subheading")}
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Details Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-xs">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("newInvoice.titleLabel")} *
            </label>
            <input
              id="invoice-title-input"
              type="text"
              required
              minLength={2}
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("newInvoice.titlePlaceholder")}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("newInvoice.dueDateLabel")} *
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("newInvoice.clientNameLabel")}
              </label>
              <input
                type="text"
                maxLength={100}
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder={t("newInvoice.clientNamePlaceholder")}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("newInvoice.clientEmailLabel")}
              </label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder={t("newInvoice.clientEmailPlaceholder")}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Line Items Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              {t("newInvoice.lineItems")}
            </h2>
            <button
              type="button"
              onClick={handleAddItem}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 cursor-pointer"
            >
              {t("newInvoice.addItem")}
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => {
              const lineTotal = (item.quantity || 0) * (item.unitPriceUsdc || 0);
              return (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
                >
                  <div className="flex-1">
                    <input
                      id={`item-desc-${idx}`}
                      type="text"
                      required
                      placeholder={t("newInvoice.itemDesc")}
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="w-20">
                    <input
                      id={`item-qty-${idx}`}
                      type="number"
                      required
                      min={1}
                      max={10000}
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                      className="w-full px-3 py-1.5 text-xs text-center rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="w-32">
                    <div className="relative">
                      <input
                        id={`item-price-${idx}`}
                        type="number"
                        step="0.01"
                        required
                        min={0.01}
                        value={item.unitPriceUsdc}
                        onChange={(e) => handleItemChange(idx, "unitPriceUsdc", e.target.value)}
                        className="w-full pl-3 pr-8 py-1.5 text-xs text-right rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                        USDC
                      </span>
                    </div>
                  </div>

                  <div className="w-24 text-right font-semibold text-xs text-slate-800 dark:text-slate-200">
                    ${lineTotal.toFixed(2)}
                  </div>

                  <button
                    type="button"
                    disabled={items.length <= 1}
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 disabled:opacity-20 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Total Calculation */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-xs text-slate-500">
              {t("newInvoice.minUsdcNotice")}
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {totalUsdc.toFixed(2)} <span className="text-xs font-normal text-slate-500">USDC</span>
              </div>
              <div className="text-[11px] text-slate-400">
                ~₹{approxInr} INR indicative
              </div>
            </div>
          </div>
        </div>

        {/* Notes Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2 shadow-xs">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t("newInvoice.notesLabel")}
          </label>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {t("newInvoice.notesSubtext")}
          </p>
          <textarea
            rows={3}
            maxLength={1000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("newInvoice.notesPlaceholder")}
            className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            id="create-invoice-submit-btn"
            type="submit"
            disabled={isSubmitting || totalUsdc < MIN_INVOICE_AMOUNT_FLOAT}
            className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
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
