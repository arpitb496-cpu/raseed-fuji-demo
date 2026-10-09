import React from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export default function RisksPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-medium">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
      </Link>

      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <p className="font-medium">
          DRAFT NOTICE: Blockchain & Smart Contract Risk Disclosure (Draft pending legal review).
        </p>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Risk Disclosures (Draft)</h1>
      
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">1. Self-Custody & Key Management</h2>
        <p>
          You are solely responsible for maintaining the security of your private keys and seed phrases. Raseed has no ability to recover lost keys, cancel sent transactions, or reverse transfers once confirmed on Avalanche C-Chain.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">2. Smart Contract Risk</h2>
        <p>
          While PaymentRouter is designed to be minimal, stateless, and audited with static analyzers, all smart contracts carry technical risks of software defects or RPC disruption. Contracts deployed on Fuji testnet are for testing purposes only.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">3. Stablecoin Peg & Circle Regulatory Controls</h2>
        <p>
          USDC is issued by Circle Internet Financial, LLC. Circle retains administrative capabilities including smart contract upgrades and blacklisting of specific wallet addresses subject to legal process.
        </p>
      </section>
    </div>
  );
}
