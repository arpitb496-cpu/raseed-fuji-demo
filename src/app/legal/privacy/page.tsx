import React from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-medium">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
      </Link>

      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <p className="font-medium">
          DEMO NOTICE: This page is a testnet demo notice, not final legal terms. Raseed is configured strictly for evaluation and partnership discussions on Avalanche Fuji testnet. No real funds are involved.
        </p>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Privacy Policy (Demo Notice)</h1>
      
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">1. Data Minimization</h2>
        <p>
          Raseed adheres to strict data minimization. We do not collect passwords, identity documents, phone numbers, or social security numbers. Client names and emails on invoices are optional.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">2. On-Chain Transparency</h2>
        <p>
          Blockchain transactions on Avalanche C-Chain are public by nature. Payout addresses, transaction hashes, and event parameters are publicly verifiable on Snowtrace.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">3. Merchant Data Rights</h2>
        <p>
          Merchants may export their invoicing records in CSV format or permanently request data deletion at any time via the merchant settings interface.
        </p>
      </section>
    </div>
  );
}
