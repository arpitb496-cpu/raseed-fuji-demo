import React from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-medium">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
      </Link>

      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <p className="font-medium">
          DRAFT NOTICE: This document is a readable draft pending formal legal and regulatory review by qualified counsel in relevant jurisdictions.
        </p>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Terms of Service (Draft)</h1>
      
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">1. Nature of the Service</h2>
        <p>
          Raseed Protocol provides open-source, non-custodial software interfaces for peer-to-peer stablecoin invoicing on Avalanche C-Chain. Raseed does not take custody of user funds, does not act as an escrow agent, money transmitter, bank, or custodian, and never possesses private keys.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">2. Tax & Compliance Responsibilities</h2>
        <p>
          Merchants and payers are solely and exclusively responsible for determining, reporting, and remitting all applicable taxes (including Goods and Services Tax / GST, VAT, sales tax, or income tax) resulting from any invoices or transactions conducted via the protocol.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">3. Disclaimer of Financial Advice & Warranties</h2>
        <p>
          Raseed does not offer investment advice, financial planning, or guarantees of any kind. Stablecoin reference rates are indicative only. Software is provided &quot;as is&quot; without warranties of any kind.
        </p>
      </section>
    </div>
  );
}
