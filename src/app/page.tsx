"use client";

import React from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { CURRENT_NETWORK } from "@/config/network";
import { INDICATIVE_USD_TO_INR_RATE } from "@/config/constants";
import {
  ArrowRight,
  Receipt,
  Lock,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  Video,
  ExternalLink,
  Users,
  Mail,
  ShieldAlert,
} from "lucide-react";

export default function HomePage() {
  const { t, lang } = useI18n();

  return (
    <div className="flex-1 flex flex-col">
      {/* 1. Hero & Value Proposition */}
      <section className="relative overflow-hidden pt-10 pb-16 md:pt-16 md:pb-24 border-b border-slate-200/80 dark:border-slate-800/80 bg-radial from-teal-500/5 via-transparent to-transparent">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          {/* Persistent Testnet Demo Notice */}
          <div
            role="banner"
            aria-label="Testnet demo notice"
            data-testid="hero-testnet-notice"
            className="inline-flex flex-wrap items-center justify-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-semibold"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span>Testnet Demo — No Real Money</span>
            <span className="text-amber-500/40">•</span>
            <span>टेस्टनेट डेमो — कोई वास्तविक धन नहीं (Avalanche Fuji)</span>
          </div>

          {/* Value Proposition Badge */}
          <div className="flex items-center justify-center">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200/70 dark:border-teal-800/70 text-teal-800 dark:text-teal-300 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>
                {lang === "hi"
                  ? "एवलांच फूजी टेस्टनेट पर गैर-कस्टोडियल चालान"
                  : "Non-Custodial USDC Invoicing on Avalanche Fuji"}
              </span>
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight">
            {lang === "hi" ? (
              <>
                सीधे अपने वॉलेट में{" "}
                <span className="text-teal-600 dark:text-teal-400 underline decoration-teal-300 dark:decoration-teal-700 underline-offset-8">
                  USDC भुगतान
                </span>{" "}
                प्राप्त करें।
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

          {/* One-Line Value Proposition */}
          <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
            {lang === "hi"
              ? "Avalanche Fuji टेस्टनेट पर नॉन-कस्टोडियल पीयर-टू-पीयर USDC इनवॉइसिंग ऐप — राशि बिना किसी मध्यस्थ कस्टडी के सीधे भुगतानकर्ता से विक्रेता के वॉलेट में जाती है।"
              : "Non-custodial USDC invoicing app on Avalanche Fuji testnet — funds transfer directly from payer to merchant with zero intermediary custody."}
          </p>

          {/* Indicative Rate Reference */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono">
            <Info className="w-3.5 h-3.5 text-slate-500" />
            <span>
              Indicative demo reference: 1 USDC ≈ ₹{INDICATIVE_USD_TO_INR_RATE.toFixed(2)} INR (illustrative demo rate, not a live rate)
            </span>
          </div>

          {/* Action CTAs */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/app"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <span>{lang === "hi" ? "व्यापारी पोर्टल खोलें" : "Launch Merchant Portal"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/about/how-it-works"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <span>{t("nav.howItWorks")}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Three-Step How It Works */}
      <section className="py-14 bg-white/60 dark:bg-slate-900/40 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {lang === "hi" ? "यह कैसे काम करता है (3 चरण)" : "How It Works (3 Steps)"}
            </h2>
            <p className="text-xs text-slate-500 max-w-xl mx-auto">
              {lang === "hi"
                ? "सरल, प्रत्यक्ष और बिना किसी कस्टोडियल मध्यस्थ के।"
                : "Simple, direct, and completely free of custodial intermediaries."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold flex items-center justify-center text-sm">
                1
              </div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                {lang === "hi" ? "1. चालान बनाएं" : "1. Merchant Issues Invoice"}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {lang === "hi"
                  ? "विक्रेता SIWE वॉलेट लॉगिन करता है और लाइन आइटम, नियत तिथि व राशि के साथ भुगतान लिंक जनरेट करता है।"
                  : "Merchant signs in with SIWE wallet authentication and creates an invoice with line items, due date, and USDC amount."}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold flex items-center justify-center text-sm">
                2
              </div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                {lang === "hi" ? "2. USDC में सीधा भुगतान" : "2. Payer Settles in USDC"}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {lang === "hi"
                  ? "भुगतानकर्ता लिंक या QR स्कैन करता है और Fuji पर PaymentRouter के माध्यम से सीधे विक्रेता को टोकन भेजता है।"
                  : "Payer opens the unguessable link or scans QR code, approves exact USDC, and settles directly to merchant via PaymentRouter on Fuji."}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold flex items-center justify-center text-sm">
                3
              </div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                {lang === "hi" ? "3. ऑन-चेन पुष्टिकरण व रसीद" : "3. On-Chain Confirmation & Receipt"}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {lang === "hi"
                  ? "सर्वर ब्लॉकचेन पर पुष्ट भुगतान ईवेंट दर्ज करता है, स्थिति अपडेट करता है, और डाउनलोड करने योग्य PDF रसीद प्रदान करता है।"
                  : "Server detects confirmed blockchain payment event, updates invoice status, and renders downloadable PDF receipts with explorer links."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Architecture in Plain Words */}
      <section className="py-14 bg-slate-50/50 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {lang === "hi" ? "आर्किटेक्चर: सरल शब्दों में" : "Architecture in Plain Words"}
            </h2>
            <p className="text-xs text-slate-500 max-w-2xl mx-auto">
              {lang === "hi"
                ? "डिज़ाइन से कोई कस्टडी नहीं। एप्लिकेशन कभी भी आपके फंड को नहीं रखता या रोकता नहीं है।"
                : "No custody by design. The application never holds, pools, or delays your funds."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                {lang === "hi" ? "गैर-कस्टोडियल ट्रांसफर" : "Direct Non-Custodial Transfer"}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {lang === "hi"
                  ? "फंड सीधे भुगतानकर्ता के वॉलेट से विक्रेता के वॉलेट में जाता है। कोई मध्यवर्ती पूल या एस्क्रो नहीं है।"
                  : "Payment flows directly from payer wallet to merchant wallet in a single atomic transaction. No intermediary escrow."}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                {lang === "hi" ? "कॉन्ट्रैक्ट में शून्य बैलेंस" : "Contract Holds Zero Funds"}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {lang === "hi"
                  ? "PaymentRouter कॉन्ट्रैक्ट कभी भी फंड नहीं रखता। यह टोकन को भुगतानकर्ता से विक्रेता तक सीधे स्थानांतरित करता है और शून्य बैलेंस रखता है।"
                  : "The PaymentRouter smart contract never holds funds: it transfers tokens atomically from payer to merchant and keeps no token balance."}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                {lang === "hi" ? "सर्वर पर कोई प्राइवेट की नहीं" : "No Server Key Custody"}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {lang === "hi"
                  ? "सर्वर कभी भी आपकी प्राइवेट की नहीं रखता। प्रमाणीकरण क्रिप्टोग्राफिक SIWE हस्ताक्षर द्वारा होता है।"
                  : "Web servers never store or access private keys. All actions are authenticated via cryptographic SIWE signatures."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. What Works Today (Tested, Working Features) */}
      <section className="py-14 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{lang === "hi" ? "Fuji टेस्टनेट पर कार्यरत" : "Working on Fuji testnet"}</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {lang === "hi" ? "आज क्या काम करता है" : "What Works Today"}
            </h2>
            <p className="text-xs text-slate-500 max-w-xl mx-auto">
              {lang === "hi"
                ? "केवल वास्तविक कार्यक्षमताएं जो Avalanche Fuji टेस्टनेट पर उपलब्ध हैं।"
                : "Only features that exist in code and pass automated test suites on Avalanche Fuji."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {[
              {
                title: "SIWE Wallet Authentication",
                titleHi: "SIWE वॉलेट प्रमाणीकरण",
                desc: "Sign-In with Ethereum with replay-protected nonces and session cookies.",
                descHi: "रीप्ले-संरक्षित नॉनस और सत्र कुकीज़ के साथ एथेरियम आधारित लॉगिन।",
              },
              {
                title: "Invoice Management & CSV Export",
                titleHi: "चालान प्रबंधन और CSV निर्यात",
                desc: "Create, edit, cancel invoices with formula-injection-protected CSV export.",
                descHi: "संरक्षित CSV निर्यात के साथ चालान बनाना, संपादित करना और रद्द करना।",
              },
              {
                title: "Pay Links & Scannable QR Codes",
                titleHi: "भुगतान लिंक और QR कोड",
                desc: "Unguessable public URLs and embedded QR codes that link directly to pay page.",
                descHi: "अप्रत्याशित सार्वजनिक URL और सीधे भुगतान पृष्ठ से जुड़े QR कोड।",
              },
              {
                title: "On-Chain Fuji USDC Payments",
                titleHi: "Fuji पर ऑन-चेन USDC भुगतान",
                desc: "PaymentRouter smart contract handles exact-allowance USDC payments on Fuji.",
                descHi: "PaymentRouter कॉन्ट्रैक्ट Fuji पर सटीक स्वीकृति के साथ भुगतान संभालता है।",
              },
              {
                title: "Server Verification & Reconciliation",
                titleHi: "सर्वर सत्यापन और मिलान",
                desc: "Background reconciliation cron detects on-chain events and confirms status.",
                descHi: "बैकग्राउंड मिलान क्रॉन ऑन-चेन घटनाओं का पता लगाता है और स्थिति पुष्ट करता है।",
              },
              {
                title: "PDF Invoices & Receipts",
                titleHi: "PDF चालान और रसीदें",
                desc: "Serverless PDF generation with embedded Devanagari font and transaction URLs.",
                descHi: "एम्बेडेड देवनागरी फॉन्ट और लेनदेन लिंक के साथ PDF चालान और रसीदें।",
              },
              {
                title: "English & Hindi (हिन्दी) UI",
                titleHi: "अंग्रेजी और हिन्दी इंटरफेस",
                desc: "Complete bilingual UI parity across merchant dashboard and payment pages.",
                descHi: "मर्चेंट डैशबोर्ड और भुगतान पृष्ठों पर पूर्ण द्विभाषी समानता।",
              },
              {
                title: "Anti-Enumeration Protections",
                titleHi: "एंटी-गणना सुरक्षा",
                desc: "Rate-limited public pay queries with uniform 'not found' response for invalid IDs.",
                descHi: "समान 'not found' प्रतिक्रियाओं के साथ दर-सीमित सार्वजनिक भुगतान क्वेरी सुरक्षा।",
              },
              {
                title: "Data Deletion & Anonymization",
                titleHi: "डेटा विलोपन और अनामीकरण",
                desc: "Self-service profile and invoice deletion, with immutable preservation for paid records.",
                descHi: "भुगतान किए गए रिकॉर्ड की सुरक्षा के साथ स्व-सेवा प्रोफ़ाइल विलोपन।",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5"
              >
                <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{lang === "hi" ? f.titleHi : f.title}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                  {lang === "hi" ? f.descHi : f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Fuji Router Contract Address */}
      <section className="py-10 bg-slate-100/60 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                <Layers className="w-4 h-4 text-teal-600" />
                <span>Avalanche Fuji Testnet Deployment</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 font-mono text-[10px] border border-amber-500/20 self-start sm:self-auto">
                Testnet Only (Chain ID: 43113)
              </span>
            </div>

            <div className="space-y-1 font-mono text-[11px]">
              <div className="text-slate-500">PaymentRouter Contract:</div>
              <div className="flex flex-wrap items-center gap-2 text-slate-900 dark:text-slate-200 break-all font-semibold">
                <span>{CURRENT_NETWORK.routerAddress || "Not configured"}</span>
                {CURRENT_NETWORK.routerAddress && (
                  <a
                    href={`${CURRENT_NETWORK.explorerUrl}/address/${CURRENT_NETWORK.routerAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-teal-800 dark:text-teal-300 hover:underline text-xs font-sans font-medium"
                  >
                    <span>View on Snowtrace</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Contract source code is{" "}
              <a
                href="https://testnet.snowtrace.io/address/0xb94A922261bBa2e07648520bf56125a4102eaB95#code"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-800 dark:text-teal-300 hover:underline font-medium"
              >
                verified on Snowtrace (Fuji testnet)
              </a>
              . Contract handles testnet USDC routing only. Protocol fee is currently 0%. The contract owner can set a fee for future payments, capped in code at 1%.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Clearly Labeled "Not Done Yet" Block */}
      <section className="py-14 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 text-[11px] font-semibold border border-rose-500/20">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Honest Disclosure of Current Limitations</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {lang === "hi" ? "क्या अभी नहीं हुआ है (Not Done Yet)" : "Not Done Yet"}
            </h2>
            <p className="text-xs text-slate-500 max-w-xl mx-auto">
              {lang === "hi"
                ? "हम अपनी वर्तमान सीमाओं के बारे में पूरी तरह पारदर्शी हैं।"
                : "Honest status for grant reviewers and technical partners regarding what is not ready."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-900/40 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-rose-800 dark:text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>No Independent Security Audit</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                Smart contracts and backend services have NOT undergone third-party independent security audits. Do not use with mainnet or real funds.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-900/40 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-rose-800 dark:text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>No Mainnet Deployment</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                CryptoDao is strictly deployed on Avalanche Fuji testnet. Mainnet deployment scripts are disabled behind safety gates until audit and grant milestones are met.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-900/40 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-rose-800 dark:text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Legal Pages are Drafts (Demo Notices Only)</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                Terms of service, privacy disclosures, and risk policies are draft demo notices, not finalized legal agreements. Software is provided strictly as-is.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-900/40 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-rose-800 dark:text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Not Production Hosted for Public Commercial Use</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                Configured as a technical testnet demonstration for strategic partnership evaluations and grant committee walkthroughs, not consumer production traffic.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Roadmap (Each labeled "planned, not built") */}
      <section className="py-14 bg-slate-50/50 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {lang === "hi" ? "रोडमैप (भविष्य की योजनाएं)" : "Planned Roadmap"}
            </h2>
            <p className="text-xs text-slate-500 max-w-xl mx-auto">
              Future development milestones. Each item is strictly labeled: planned, not built.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {[
              {
                title: "Multi-Token Invoicing (e.g., USDT)",
                desc: "Support for additional ERC-20 stablecoin settlement options alongside Circle USDC.",
                status: "planned, not built",
              },
              {
                title: "Additional EVM Chain Deployments (e.g., Arbitrum, Optimism)",
                desc: "Deploying PaymentRouter across other EVM-compatible Layer 2 ecosystems. Solana support is planned, not built. It would require a separate non-EVM program.",
                status: "planned, not built",
              },
              {
                title: "Webhook Notifications for Merchant ERPs",
                desc: "Real-time signed HTTP webhooks notifying external accounting software upon confirmed payment.",
                status: "planned, not built",
              },
              {
                title: "Recurring Subscription Invoicing",
                desc: "Automated recurring invoice generation and periodic settlement requests for retainer clients.",
                status: "planned, not built",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[10px] font-mono font-medium shrink-0">
                    {item.status}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Demo Video Slot Placeholder */}
      <section className="py-14 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {lang === "hi" ? "डेमो वॉकथ्रू वीडियो" : "Architecture & Fuji Demo Walkthrough"}
            </h2>
            <p className="text-xs text-slate-500 max-w-xl mx-auto">
              Visual overview for grant reviewers and technical integrators.
            </p>
          </div>

          <div className="aspect-video w-full rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Video className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                Demo Video Slot (Placeholder)
              </div>
              <p className="text-xs text-slate-500 max-w-md">
                A recorded walkthrough of wallet connection, invoice creation, Fuji USDC payment, and PDF receipt verification will be embedded here.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Team & Contact Placeholders marked TODO */}
      <section className="py-14 bg-slate-50/50 dark:bg-slate-950/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Team &amp; Contact
            </h2>
            <p className="text-xs text-slate-500 max-w-xl mx-auto">
              Open communication channels for grant committees and prospective partners.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white text-sm">
                <Users className="w-4 h-4 text-teal-600" />
                <span>Contributors</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-mono">
                [TODO: Core engineering contributors and advisor profiles to be published during grant review]
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white text-sm">
                <Mail className="w-4 h-4 text-teal-600" />
                <span>Partnership &amp; Grant Inquiries</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-mono">
                [TODO: Partnership and grant committee contact point — inquiries handled via repository issues during testnet demo phase]
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
