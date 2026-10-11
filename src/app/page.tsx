"use client";

import React from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useAuth } from "@/lib/auth/useAuth";
import { useI18n } from "@/lib/i18n";
import { CURRENT_NETWORK } from "@/config/network";
import { MIN_INVOICE_AMOUNT_FLOAT, INDICATIVE_USD_TO_INR_RATE, INDICATIVE_RATE_AS_OF } from "@/config/constants";
import {
  ShieldCheck,
  ArrowRight,
  Receipt,
  Lock,
  Layers,
  Sparkles,
  Info
} from "lucide-react";

export default function HomePage() {
  const { isConnected } = useAccount();
  const { isAuthenticated, signIn, isSigning, merchant } = useAuth();
  const { t, lang } = useI18n();

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b border-slate-200/80 dark:border-slate-800/80 bg-radial from-teal-500/5 via-transparent to-transparent">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200/70 dark:border-teal-800/70 text-teal-800 dark:text-teal-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>
              {lang === "hi"
                ? "एवलांच सी-चेन पर गैर-कस्टोडियल रसीदें"
                : "Non-Custodial USDC Invoicing on Avalanche C-Chain"}
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight">
            {lang === "hi" ? (
              <>
                सीधे अपने वॉलेट में <span className="text-teal-600 dark:text-teal-400 underline decoration-teal-300 dark:decoration-teal-700 underline-offset-8">USDC भुगतान</span> प्राप्त करें।
              </>
            ) : (
              <>
                Get paid in USDC. Funds go{" "}
                <span className="text-teal-600 dark:text-teal-400 underline decoration-teal-300 dark:decoration-teal-700 underline-offset-8">
                  straight to your wallet.
                </span>
              </>
            )}
          </h1>

          {/* Subheading */}
          <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {lang === "hi"
              ? "फ्रीलांसरों और व्यवसायों के लिए पीयर-टू-पीयर पेमेंट लिंक। न कोई मध्यस्थ, न कोई फंड लॉकअप। शून्य कस्टडी।"
              : "Peer-to-peer invoice links for global & Indian freelancers. No intermediary holds your money. Zero custody. Confirmed on-chain with deterministic settlement."}
          </p>

          {/* Indicative Rate Reference */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-mono-code">
            <Info className="w-3.5 h-3.5" />
            <span>
              Indicative reference (as of {INDICATIVE_RATE_AS_OF}, not a live rate): 1 USDC ≈ ₹{INDICATIVE_USD_TO_INR_RATE.toFixed(2)} INR
            </span>
          </div>

          {/* Action CTAs */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            {!isConnected ? (
              <div className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-900 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800">
                👉 Connect your Web3 wallet using the button in the top navigation to begin.
              </div>
            ) : isAuthenticated ? (
              <Link
                href="/app"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-sm transition-all"
              >
                <span>Go to Merchant Portal ({merchant?.displayName})</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <button
                onClick={signIn}
                disabled={isSigning}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isSigning ? t("auth.signing") : t("nav.signInWithEthereum")}</span>
              </button>
            )}

            <Link
              href="/about/how-it-works"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-sm transition-colors"
            >
              <span>{t("nav.howItWorks")}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Protocol Architecture Features Grid */}
      <section className="py-16 bg-white/40 dark:bg-slate-900/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Why Non-Custodial Stablecoin Invoicing Matters
            </h2>
            <p className="text-sm text-slate-500 max-w-xl mx-auto">
              Built on Avalanche C-Chain for deterministic sub-second finality and sub-cent fees.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                Zero Fund Custody
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Neither the Raseed web servers nor the PaymentRouter contract ever touch or hold your USDC. Transfers move directly from payer to merchant in one atomic transaction.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                Stateless Anti-Griefing Routing
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Stateless smart contracts prevent micro-payment denial of service attacks. Settlement is cryptographically verified off-chain with cumulative event summation.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                Honest Verification & Accounting
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Min. amount {MIN_INVOICE_AMOUNT_FLOAT.toFixed(2)} USDC. Tracks cumulative payments, flags partial payments and overpayments honestly, and generates verifiable PDF receipts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Network Status & Trust Banner */}
      <section className="py-10 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="space-y-1 text-center sm:text-left">
              <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-center sm:justify-start gap-1.5">
                <Layers className="w-4 h-4 text-teal-600" />
                <span>Target Chain: {CURRENT_NETWORK.name}</span>
              </div>
              <p className="text-slate-500 font-mono-code text-[11px]">
                Native USDC: {CURRENT_NETWORK.usdcAddress}
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium text-[11px] border border-amber-500/20">
                Status: Testnet Demo (Avalanche Fuji)
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
