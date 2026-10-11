import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function HowItWorksPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-medium">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
      </Link>

      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          How Raseed Works
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Non-custodial, peer-to-peer USDC invoicing on Avalanche Fuji testnet.
        </p>
      </div>

      <div className="space-y-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="font-semibold text-teal-600 dark:text-teal-400 text-sm">Step 1: Merchant Connects & Issues Invoice</div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            The merchant signs in with their Web3 wallet using Sign-In with Ethereum (SIWE). No private keys or custody credentials are ever stored. The merchant generates a shareable payment link with line items and due date.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="font-semibold text-teal-600 dark:text-teal-400 text-sm">Step 2: Payer Connects & Pays in USDC</div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            The payer opens the unguessable link, approves the exact invoice amount in native Circle USDC, and calls the PaymentRouter smart contract. Funds transfer atomically and directly into the merchant&apos;s wallet.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="font-semibold text-teal-600 dark:text-teal-400 text-sm">Step 3: On-Chain Confirmation &amp; Receipts</div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            The server monitors the canonical Avalanche Fuji blockchain, matches the confirmed on-chain Paid event, updates the invoice status to Paid, and generates downloadable PDF receipts and Snowtrace explorer links.
          </p>
        </div>
      </div>
    </div>
  );
}
