"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { CURRENT_NETWORK, isConfiguredAddress } from "@/config/network";
import { INDICATIVE_USD_TO_INR_RATE } from "@/config/constants";
import {
  ArrowRight,
  Receipt,
  Lock,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Shield,
  Calendar,
} from "lucide-react";

export default function HomePage() {
  const { t, lang } = useI18n();
  const [showSpotlightDetails, setShowSpotlightDetails] = useState(false);

  const capabilities = [
    {
      tag: lang === "hi" ? "प्रमाणीकरण" : "Authentication",
      title: "SIWE Wallet Authentication",
      titleHi: "SIWE वॉलेट प्रमाणीकरण",
      desc: "Sign-In with Ethereum with replay-protected nonces and session cookies.",
      descHi: "रीप्ले-संरक्षित नॉनस और सत्र कुकीज़ के साथ एथेरियम आधारित लॉगिन।",
    },
    {
      tag: lang === "hi" ? "प्रबंधन" : "Management",
      title: "Invoice Management & CSV Export",
      titleHi: "चालान प्रबंधन और CSV निर्यात",
      desc: "Create, edit, cancel invoices with formula-injection-protected CSV export.",
      descHi: "संरक्षित CSV निर्यात के साथ चालान बनाना, संपादित करना और रद्द करना।",
    },
    {
      tag: lang === "hi" ? "भुगतान लिंक" : "Pay Links",
      title: "Pay Links & Scannable QR Codes",
      titleHi: "भुगतान लिंक और QR कोड",
      desc: "Unguessable public URLs and embedded QR codes that link directly to pay page.",
      descHi: "अप्रत्याशित सार्वजनिक URL और सीधे भुगतान पृष्ठ से जुड़े QR कोड।",
    },
    {
      tag: lang === "hi" ? "ऑन-चेन" : "On-Chain",
      title: "On-Chain Fuji USDC Payments",
      titleHi: "Fuji पर ऑन-चेन USDC भुगतान",
      desc: "PaymentRouter smart contract handles exact-allowance USDC payments on Fuji.",
      descHi: "PaymentRouter कॉन्ट्रैक्ट Fuji पर सटीक स्वीकृति के साथ भुगतान संभालता है।",
    },
    {
      tag: lang === "hi" ? "मिलान" : "Reconciliation",
      title: "Server Reconciliation & Events",
      titleHi: "सर्वर मिलान और ईवेंट जांच",
      desc: "Background reconciliation cron detects on-chain events and confirms invoice status.",
      descHi: "बैकग्राउंड मिलान क्रॉन ऑन-चेन घटनाओं का पता लगाता है और स्थिति पुष्ट करता है।",
    },
    {
      tag: lang === "hi" ? "दस्तावेज़" : "Documents",
      title: "PDF Invoices & Receipts",
      titleHi: "PDF चालान और रसीदें",
      desc: "Serverless PDF generation with embedded Devanagari font and transaction URLs.",
      descHi: "एम्बेडेड देवनागरी फॉन्ट और लेनदेन लिंक के साथ PDF चालान और रसीदें।",
    },
    {
      tag: lang === "hi" ? "द्विभाषी" : "Bilingual",
      title: "English & Hindi (हिन्दी) UI",
      titleHi: "अंग्रेजी और हिन्दी इंटरफेस",
      desc: "Complete bilingual UI parity across merchant dashboard and payment pages.",
      descHi: "मर्चेंट डैशबोर्ड और भुगतान पृष्ठों पर पूर्ण द्विभाषी समानता।",
    },
    {
      tag: lang === "hi" ? "सुरक्षा नियंत्रण" : "Hardening",
      title: "Anti-Enumeration Protections",
      titleHi: "एंटी-गणना सुरक्षा",
      desc: "Rate-limited public pay queries with uniform 'not found' response for invalid IDs.",
      descHi: "समान 'not found' प्रतिक्रियाओं के साथ दर-सीमित सार्वजनिक भुगतान क्वेरी सुरक्षा।",
    },
    {
      tag: lang === "hi" ? "गोपनीयता" : "Privacy",
      title: "Data Deletion & Anonymization",
      titleHi: "डेटा विलोपन और अनामीकरण",
      desc: "Self-service profile and invoice deletion, with immutable preservation for paid records.",
      descHi: "भुगतान किए गए रिकॉर्ड की सुरक्षा के साथ स्व-सेवा प्रोफ़ाइल विलोपन।",
    },
  ];

  const roadmapItems = [
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
  ];

  return (
    <div className="min-h-screen bg-[#fffaf0]">
      {/* 1. Hero Section */}
      <section className="py-12 sm:py-16 lg:py-20 border-b border-[#e5e5e5]">
        <div className="page-container">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 items-center">
            {/* Left Column: Editorial Headline & CTAs */}
            <div className="lg:col-span-6 flex flex-col justify-center space-y-5">
              <div className="nyc-kicker">
                {lang === "hi"
                  ? "CRYPTODAO · एवलांच फूजी टेस्टनेट"
                  : "CryptoDao · Non-Custodial USDC Invoicing"}
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-display font-medium text-[#0a0a0a] leading-[1.04] tracking-[-0.04em] text-balance">
                {lang === "hi" ? (
                  <>
                    सीधे अपने वॉलेट में{" "}
                    <span className="font-editorial nyc-accent-terra">
                      USDC भुगतान प्राप्त करें
                    </span>
                  </>
                ) : (
                  <>
                    Get Paid in USDC,{" "}
                    <span className="font-editorial nyc-accent-terra">
                      Straight to Your Wallet
                    </span>
                  </>
                )}
              </h1>

              <p className="text-base sm:text-[18px] text-[#3a3a3a] max-w-xl leading-[1.55]">
                {lang === "hi"
                  ? "Avalanche Fuji टेस्टनेट पर नॉन-कस्टोडियल पीयर-टू-पीयर USDC इनवॉइसिंग ऐप — राशि बिना किसी मध्यस्थ कस्टडी के सीधे भुगतानकर्ता से विक्रेता के वॉलेट में जाती है।"
                  : "Non-custodial USDC invoicing app on Avalanche Fuji testnet — funds transfer directly from payer to merchant with zero intermediary custody."}
              </p>

              {/* Primary + Secondary CTAs */}
              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 pt-1">
                <Link
                  href="/app"
                  prefetch={false}
                  className="clay-btn-primary w-full sm:w-auto"
                >
                  <span>
                    {lang === "hi" ? "व्यापारी पोर्टल खोलें" : "Launch Merchant Portal"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/demo"
                  className="clay-btn-secondary w-full sm:w-auto"
                >
                  <span>
                    {lang === "hi" ? "नमूना चालान आज़माएं" : "Try a Sample Invoice"}
                  </span>
                </Link>
              </div>

              <div className="pt-1">
                <Link
                  href="/about/how-it-works"
                  className="nyc-link-arrow inline-flex items-center gap-1.5 text-sm font-medium text-[#0a0a0a] hover:underline underline-offset-4"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#b64d31]" />
                  <span>{t("nav.howItWorks")}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Right Column: Framed 16:9 Visual Card (matches ReadyForAI hero stage) */}
            <div className="lg:col-span-6 flex items-center">
              <div className="w-full bg-[#faf5e8] border border-[#e5e5e5] rounded-[22px] sm:rounded-[24px] p-2.5 sm:p-3 nyc-card-lift">
                <div
                  className="relative rounded-[14px] sm:rounded-[16px] overflow-hidden min-h-[250px] sm:min-h-0 sm:aspect-video w-full border border-[#e5e5e5] flex flex-col justify-between p-3.5 sm:p-6 gap-2"
                  style={{
                    background:
                      "radial-gradient(75% 85% at 15% 15%, #f5f0e0 0%, rgba(255,250,240,0) 60%), radial-gradient(70% 80% at 88% 85%, #ffb084 0%, #e8b94a 28%, rgba(255,250,240,0) 68%), linear-gradient(135deg, #f5f0e0 0%, #ebe6d6 100%)",
                  }}
                >
                  {/* Top Row: Dark Checklist Card + Brand Badge */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="bg-[#1a1a1a]/95 text-[#fffaf0] rounded-[12px] px-2.5 py-2 sm:px-3 sm:py-2.5 text-[10px] sm:text-[11px] space-y-1 sm:space-y-1.5 shadow-lg border border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="text-[#ffb084]">✦</span>
                        <span>Direct Wallet Transfer</span>
                        <span className="text-[#a4d4c5] ml-1">✓</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#a4d4c5]">&lt;/&gt;</span>
                        <span>Exact USDC Allowance</span>
                        <span className="text-[#a4d4c5] ml-1">✓</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#b8a4ed]">●</span>
                        <span>PDF Receipt &amp; Snowtrace</span>
                        <span className="text-[#a4d4c5] ml-1">✓</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-1 bg-white/90 border border-[#e5e5e5] rounded-[14px] px-3 py-2 shadow-sm">
                      <Receipt className="w-5 h-5 text-[#0a0a0a]" />
                      <span className="text-[10px] font-medium text-[#0a0a0a]">
                        CryptoDao
                      </span>
                    </div>
                  </div>

                  {/* Stepped Dark Flow Pills (Issue -> Approve -> Settle) */}
                  <div className="relative flex flex-col gap-2 mt-2">
                    <div className="self-end bg-[#1a1a1a] text-[#fffaf0] rounded-[12px] px-4 py-2 flex items-center gap-2.5 shadow-md border border-white/10">
                      <span className="w-5 h-5 rounded-full bg-[#b8a4ed] text-[#0a0a0a] text-[10px] font-semibold flex items-center justify-center">
                        3
                      </span>
                      <span className="text-sm sm:text-base font-display font-medium">
                        {lang === "hi" ? "सीधा निपटान" : "Settle"}
                      </span>
                    </div>

                    <div className="self-center bg-[#1a1a1a] text-[#fffaf0] rounded-[12px] px-4 py-2 flex items-center gap-2.5 shadow-md border border-white/10">
                      <span className="w-5 h-5 rounded-full bg-[#a4d4c5] text-[#0a0a0a] text-[10px] font-semibold flex items-center justify-center">
                        2
                      </span>
                      <span className="text-sm sm:text-base font-display font-medium">
                        {lang === "hi" ? "USDC स्वीकृति" : "Approve USDC"}
                      </span>
                    </div>

                    <div className="self-start bg-[#1a1a1a] text-[#fffaf0] rounded-[12px] px-4 py-2 flex items-center gap-2.5 shadow-md border border-white/10">
                      <span className="w-5 h-5 rounded-full bg-[#ffb084] text-[#0a0a0a] text-[10px] font-semibold flex items-center justify-center">
                        1
                      </span>
                      <span className="text-sm sm:text-base font-display font-medium">
                        {lang === "hi" ? "चालान बनाएं" : "Issue Invoice"}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Right Caption */}
                  <div className="flex items-end justify-between gap-2 pt-1">
                    <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-[#3a3a3a]">
                      1 USDC ≈ ₹{INDICATIVE_USD_TO_INR_RATE.toFixed(2)} INR (demo ref)
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#0a0a0a] text-right leading-tight">
                      AVALANCHE FUJI · CHAIN 43113
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4-Card Stat Strip (matches ReadyForAI hero footer grid) */}
          <div className="mt-12 sm:mt-14 pt-8 border-t border-[#e5e5e5] grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-[#f5f0e0] border border-[#e5e5e5] rounded-[18px] px-5 py-4 sm:p-5">
              <div className="nyc-stat-num">0%</div>
              <div className="text-xs sm:text-sm font-medium text-[#3a3a3a] mt-2">
                {lang === "hi"
                  ? "वर्तमान राउटर शुल्क (1% सीमा)"
                  : "Current router fee (1% cap)"}
              </div>
            </div>

            <div className="bg-[#f5f0e0] border border-[#e5e5e5] rounded-[18px] px-5 py-4 sm:p-5">
              <div className="nyc-stat-num">3</div>
              <div className="text-xs sm:text-sm font-medium text-[#3a3a3a] mt-2">
                {lang === "hi"
                  ? "चालान से रसीद तक चरण"
                  : "Steps to direct settlement"}
              </div>
            </div>

            <div className="bg-[#f5f0e0] border border-[#e5e5e5] rounded-[18px] px-5 py-4 sm:p-5">
              <div className="nyc-stat-num">43113</div>
              <div className="text-xs sm:text-sm font-medium text-[#3a3a3a] mt-2">
                {lang === "hi"
                  ? "एवलांच फूजी चेन आईडी"
                  : "Avalanche Fuji Chain ID"}
              </div>
            </div>

            <div className="bg-[#f5f0e0] border border-[#e5e5e5] rounded-[18px] px-5 py-4 sm:p-5">
              <div className="nyc-stat-num">1.00</div>
              <div className="text-xs sm:text-sm font-medium text-[#3a3a3a] mt-2">
                {lang === "hi" ? "न्यूनतम चालान (USDC)" : "Minimum invoice (USDC)"}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Three-Step How It Works (Peach, Teal, Lavender Clay Cards) */}
      <section className="py-14 sm:py-16 lg:py-20 border-b border-[#e5e5e5]">
        <div className="page-container">
          <div className="max-w-xl mb-8 sm:mb-10 space-y-2">
            <div className="nyc-kicker">
              {lang === "hi" ? "यह कैसे काम करता है" : "How It Works"}
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-display font-medium text-[#0a0a0a] leading-[1.06]">
              {lang === "hi" ? (
                <>
                  USDC में भुगतान प्राप्त करें,{" "}
                  <span className="font-editorial nyc-accent-terra">
                    3 सरल चरणों में
                  </span>
                </>
              ) : (
                <>
                  Settle USDC in{" "}
                  <span className="font-editorial nyc-accent-terra">
                    3 Easy Steps
                  </span>
                </>
              )}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 items-stretch">
            <div className="clay-card-peach h-full flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <div className="nyc-kicker !text-[#1a1a1a]">01</div>
                <h3 className="text-2xl font-display font-medium text-[#0a0a0a]">
                  {lang === "hi" ? "चालान बनाएं" : "Merchant Issues Invoice"}
                </h3>
                <p className="text-sm text-[#1a1a1a] leading-relaxed">
                  {lang === "hi"
                    ? "विक्रेता SIWE वॉलेट लॉगिन करता है और लाइन आइटम, नियत तिथि व राशि के साथ भुगतान लिंक जनरेट करता है।"
                    : "Merchant signs in with SIWE wallet authentication and creates an invoice with line items, due date, and USDC amount."}
                </p>
              </div>
            </div>

            <div className="clay-card-teal h-full flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <div className="nyc-kicker !text-[#a4d4c5]">02</div>
                <h3 className="text-2xl font-display font-medium text-white">
                  {lang === "hi" ? "USDC में सीधा भुगतान" : "Payer Settles in USDC"}
                </h3>
                <p className="text-sm text-[#f0f0f0] leading-relaxed">
                  {lang === "hi"
                    ? "भुगतानकर्ता लिंक या QR स्कैन करता है और Fuji पर PaymentRouter के माध्यम से सीधे विक्रेता को टोकन भेजता है।"
                    : "Payer opens the unguessable link or scans QR code, approves exact USDC, and settles directly to merchant via PaymentRouter on Fuji."}
                </p>
              </div>
            </div>

            <div className="clay-card-lavender h-full flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <div className="nyc-kicker !text-[#1a1a1a]">03</div>
                <h3 className="text-2xl font-display font-medium text-[#0a0a0a]">
                  {lang === "hi"
                    ? "ऑन-चेन पुष्टिकरण व रसीद"
                    : "Confirmation & Receipt"}
                </h3>
                <p className="text-sm text-[#1a1a1a] leading-relaxed">
                  {lang === "hi"
                    ? "सर्वर ब्लॉकचेन पर पुष्ट भुगतान ईवेंट दर्ज करता है, स्थिति अपडेट करता है, और डाउनलोड करने योग्य PDF रसीद प्रदान करता है।"
                    : "Server detects confirmed blockchain payment event, updates invoice status, and renders downloadable PDF receipts with explorer links."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Dark Callout Banner + Interactive Sample Spotlight Card */}
      <section className="py-14 sm:py-16 lg:py-20 border-b border-[#e5e5e5]">
        <div className="page-container">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div className="space-y-1.5">
              <div className="nyc-kicker">
                {lang === "hi" ? "इंटरैक्टिव डेमो" : "Interactive Walkthrough"}
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-display font-medium text-[#0a0a0a]">
                {lang === "hi" ? (
                  <>
                    नमूना{" "}
                    <span className="font-editorial nyc-accent-forest">
                      चालान देखें
                    </span>
                  </>
                ) : (
                  <>
                    Sample{" "}
                    <span className="font-editorial nyc-accent-forest">
                      Invoice Flow
                    </span>
                  </>
                )}
              </h2>
            </div>

            <Link
              href="/demo"
              className="nyc-link-arrow text-sm font-medium text-[#0a0a0a] hover:underline inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <span>
                {lang === "hi" ? "नमूना चालान आज़माएं" : "Try a Sample Invoice"}
              </span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Dark Statement Banner (matches "Bro, nothing is free..." bar) */}
          <div className="mb-8 bg-[#0a0a0a] text-[#fffaf0] rounded-[22px] px-6 py-5 sm:px-8 sm:py-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <h3 className="text-xl sm:text-2xl lg:text-[28px] font-display font-medium leading-tight tracking-[-0.025em] text-[#fffaf0]">
              {lang === "hi" ? (
                <>
                  कोई मध्यस्थ कस्टडी नहीं।{" "}
                  <span className="font-editorial text-[#ffb084]">
                    फंड सीधे भुगतानकर्ता से विक्रेता तक जाते हैं।
                  </span>
                </>
              ) : (
                <>
                  Zero intermediary custody.{" "}
                  <span className="font-editorial text-[#ffb084]">
                    Funds move straight from payer to merchant.
                  </span>
                </>
              )}
            </h3>
            <p className="text-xs sm:text-sm text-[#d6d1c4] lg:text-right shrink-0">
              {lang === "hi"
                ? "टेस्टनेट डेमो (not audited)। वास्तविक धन के लिए नहीं।"
                : "Testnet demo. Not audited. Not for real funds."}
            </p>
          </div>

          {/* Spotlight Card (.wk-card) */}
          <div className="wk-card !p-5 sm:!p-7 lg:!p-8 grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-9 items-center">
            <div className="lg:col-span-5 flex flex-col gap-3">
              <div className="aspect-video rounded-[18px] bg-[#f5f0e0] border border-[#e5e5e5] p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#6a6a6a]">
                    INV-SAMPLE-001
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-[#a4d4c5] text-[#0a0a0a] text-[11px] font-medium">
                    250.00 USDC
                  </span>
                </div>
                <div>
                  <div className="text-lg font-display font-medium text-[#0a0a0a]">
                    {lang === "hi"
                      ? "वेबसाइट डिज़ाइन और स्थानीयकरण"
                      : "Website design and localisation"}
                  </div>
                  <div className="text-xs text-[#6a6a6a] mt-1">
                    {lang === "hi"
                      ? "Studio Asha · आंशिक व अंतिम भुगतान उदाहरण"
                      : "Studio Asha · Deposit + final payment walkthrough"}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-[#e5e5e5] text-xs font-mono text-[#3a3a3a]">
                  <span>100.00 + 150.00 USDC</span>
                  <span>No wallet needed</span>
                </div>
              </div>

              <span className="inline-flex items-center gap-2 w-fit rounded-full bg-[#fffaf0] border border-[#e5e5e5] px-3 py-1.5 text-xs font-medium text-[#0a0a0a]">
                <Receipt className="w-3.5 h-3.5 text-[#b64d31]" />
                <span>{CURRENT_NETWORK.name}</span>
              </span>
            </div>

            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <span className="wk-cat is-paid">
                  {lang === "hi" ? "इंटरैक्टिव डेमो" : "Browser Simulation"}
                </span>
                <span className="wk-date">
                  <b>Fuji</b>
                  <i>Chain ID 43113</i>
                </span>
              </div>

              <h3 className="!mt-1 text-2xl sm:text-3xl font-display font-medium text-[#0a0a0a] leading-tight">
                {lang === "hi"
                  ? "चालान से भुगतान की रसीद तक — वॉलेट के बिना देखें"
                  : "From Invoice to Payment Receipt — Explore Without a Wallet"}
              </h3>

              <div className="space-y-2 text-[#3a3a3a] text-sm sm:text-[15px]">
                <p className="leading-relaxed">
                  {lang === "hi"
                    ? "एक ही चालान पर 100 USDC अग्रिम भुगतान और 150 USDC अंतिम भुगतान का लाइव सिमुलेशन देखें।"
                    : "Step through a 250 USDC freelance invoice from awaiting payment, to a 100 USDC deposit, to final settlement and receipt."}
                </p>

                <button
                  type="button"
                  onClick={() => setShowSpotlightDetails((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#0a0a0a] hover:underline pt-1 cursor-pointer"
                >
                  <span>
                    {lang === "hi"
                      ? "सांकेतिक संदर्भ दर विवरण"
                      : "Indicative Rate & Simulation Details"}
                  </span>
                  {showSpotlightDetails ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {showSpotlightDetails && (
                  <div className="mt-2 p-3.5 rounded-[12px] bg-[#fffaf0] border border-[#e5e5e5] text-xs text-[#3a3a3a] space-y-1.5">
                    <div className="flex items-center gap-1.5 font-mono text-[#0a0a0a]">
                      <Info className="w-3.5 h-3.5 text-[#b64d31]" />
                      <span>
                        Indicative demo reference: 1 USDC ≈ ₹{INDICATIVE_USD_TO_INR_RATE.toFixed(2)} INR (illustrative demo rate, not a live rate)
                      </span>
                    </div>
                    <p>
                      {lang === "hi"
                        ? "नमूना चालान पेज पूरी तरह ब्राउज़र में चलता है और कोई API कॉल या ऑन-चेन लेनदेन नहीं करता।"
                        : "The sample walkthrough runs locally in your browser with zero API writes or wallet prompts."}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[#e5e5e5] flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-[#3a3a3a]">
                  <Calendar className="w-4 h-4 text-[#b64d31] shrink-0" />
                  <span>
                    <strong className="font-medium text-[#0a0a0a] block">
                      {lang === "hi" ? "अंग्रेजी और हिन्दी" : "Bilingual EN / हिन्दी"}
                    </strong>
                    <span className="text-[#6a6a6a]">
                      Testnet demo · Not audited
                    </span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <Link
                    href="/about/how-it-works"
                    className="px-4 min-h-[42px] inline-flex items-center rounded-full border border-[#e5e5e5] bg-[#fffaf0] hover:bg-[#ebe6d6] text-xs font-medium text-[#0a0a0a] transition-colors"
                  >
                    {t("nav.howItWorks")}
                  </Link>
                  <Link href="/demo" className="wk-reg">
                    <span>
                      {lang === "hi"
                        ? "नमूना चालान आज़माएं"
                        : "Try a Sample Invoice"}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. What Works Today (Review-card style grid in #f5f0e0) */}
      <section className="py-14 sm:py-16 lg:py-20 border-b border-[#e5e5e5]">
        <div className="page-container">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10">
            <div className="space-y-1.5">
              <div className="nyc-kicker">
                {lang === "hi" ? "Fuji टेस्टनेट पर कार्यरत" : "Working on Fuji Testnet"}
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-display font-medium text-[#0a0a0a]">
                {lang === "hi" ? (
                  <>
                    आज क्या{" "}
                    <span className="font-editorial nyc-accent-terra">
                      काम करता है
                    </span>
                  </>
                ) : (
                  <>
                    What Works{" "}
                    <span className="font-editorial nyc-accent-terra">
                      Today
                    </span>
                  </>
                )}
              </h2>
            </div>

            <Link
              href="/app"
              prefetch={false}
              className="clay-btn-secondary w-full sm:w-auto"
            >
              <span>
                {lang === "hi" ? "व्यापारी पोर्टल खोलें" : "Launch Merchant Portal"}
              </span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {capabilities.map((f, i) => (
              <div
                key={i}
                className="bg-[#f5f0e0] rounded-[20px] p-6 h-full flex flex-col justify-between space-y-4 border border-[#e5e5e5] hover:border-[#0a0a0a] nyc-card-lift"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#173f32]">
                      <CheckCircle2 className="w-4 h-4 text-[#173f32] shrink-0" />
                      <span>{f.tag}</span>
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#e8b94a] border border-[#0a0a0a]" />
                  </div>
                  <p className="text-sm text-[#1a1a1a] leading-relaxed">
                    {lang === "hi" ? f.descHi : f.desc}
                  </p>
                </div>

                <div className="pt-3.5 border-t border-[#e5e5e5] text-xs">
                  <div className="font-medium text-[#0a0a0a] text-sm">
                    {lang === "hi" ? f.titleHi : f.title}
                  </div>
                  <div className="text-[#6a6a6a] mt-0.5">
                    Avalanche Fuji Testnet
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Architecture & Fuji Contract Deployment (Matches Ambassador Split Section) */}
      <section className="py-14 sm:py-16 lg:py-20 border-b border-[#e5e5e5] bg-[#faf5e8]">
        <div className="page-container">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left 5 Cols: Architecture in Plain Words */}
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 nyc-kicker !text-[#0a0a0a]">
                  <Shield className="w-4 h-4 text-[#173f32]" />
                  <span>
                    {lang === "hi"
                      ? "आर्किटेक्चर: सरल शब्दों में"
                      : "Architecture in Plain Words"}
                  </span>
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-display font-medium text-[#0a0a0a] leading-[1.06]">
                  {lang === "hi" ? (
                    <>
                      डिज़ाइन से{" "}
                      <span className="font-editorial nyc-accent-forest">
                        कोई कस्टडी नहीं
                      </span>
                    </>
                  ) : (
                    <>
                      Zero Custody{" "}
                      <span className="font-editorial nyc-accent-forest">
                        By Design
                      </span>
                    </>
                  )}
                </h2>
                <p className="text-base text-[#3a3a3a] leading-relaxed">
                  {lang === "hi"
                    ? "एप्लिकेशन कभी भी आपके फंड को नहीं रखता या रोकता नहीं है।"
                    : "The application never holds, pools, or delays your funds."}
                </p>
              </div>

              <ul className="space-y-4 pt-1 text-sm text-[#1a1a1a]">
                <li className="flex items-start gap-3">
                  <Lock className="w-4 h-4 text-[#b64d31] shrink-0 mt-1" />
                  <div>
                    <div className="font-medium text-[#0a0a0a]">
                      {lang === "hi"
                        ? "गैर-कस्टोडियल ट्रांसफर"
                        : "Direct Non-Custodial Transfer"}
                    </div>
                    <div className="text-xs text-[#3a3a3a] leading-relaxed mt-0.5">
                      {lang === "hi"
                        ? "फंड सीधे भुगतानकर्ता के वॉलेट से विक्रेता के वॉलेट में जाता है। कोई मध्यवर्ती पूल या एस्क्रो नहीं है।"
                        : "Payment flows directly from payer wallet to merchant wallet in a single atomic transaction."}
                    </div>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <Layers className="w-4 h-4 text-[#173f32] shrink-0 mt-1" />
                  <div>
                    <div className="font-medium text-[#0a0a0a]">
                      {lang === "hi"
                        ? "कॉन्ट्रैक्ट में शून्य बैलेंस"
                        : "Contract Holds Zero Funds"}
                    </div>
                    <div className="text-xs text-[#3a3a3a] leading-relaxed mt-0.5">
                      {lang === "hi"
                        ? "PaymentRouter कॉन्ट्रैक्ट कभी भी फंड नहीं रखता और शून्य बैलेंस रखता है।"
                        : "The PaymentRouter smart contract never holds funds and keeps no token balance."}
                    </div>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <Receipt className="w-4 h-4 text-[#b64d31] shrink-0 mt-1" />
                  <div>
                    <div className="font-medium text-[#0a0a0a]">
                      {lang === "hi"
                        ? "सर्वर पर कोई प्राइवेट की नहीं"
                        : "No Server Key Custody"}
                    </div>
                    <div className="text-xs text-[#3a3a3a] leading-relaxed mt-0.5">
                      {lang === "hi"
                        ? "सर्वर कभी भी आपकी प्राइवेट की नहीं रखता। प्रमाणीकरण क्रिप्टोग्राफिक SIWE हस्ताक्षर द्वारा होता है।"
                        : "Web servers never store or access private keys. Actions authenticate via SIWE signatures."}
                    </div>
                  </div>
                </li>
              </ul>
            </div>

            {/* Right 7 Cols: Framed #fffaf0 Contract & Deployment Card */}
            <div className="lg:col-span-7">
              <div className="w-full bg-[#fffaf0] border border-[#0a0a0a] rounded-[24px] p-6 sm:p-8 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#e5e5e5]">
                  <h3 className="text-xl font-display font-medium text-[#0a0a0a]">
                    Avalanche Fuji Testnet Deployment
                  </h3>
                  <span className="wk-cat is-paid">
                    Testnet Only (Chain ID: 43113)
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-medium text-[#0a0a0a]">
                    {lang === "hi"
                      ? "PaymentRouter अनुबंध:"
                      : "PaymentRouter Contract:"}
                  </div>
                  {isConfiguredAddress(CURRENT_NETWORK.routerAddress) ? (
                    <div className="p-3.5 rounded-[12px] bg-[#f5f0e0] border border-[#e5e5e5] flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs text-[#0a0a0a] break-all">
                        {CURRENT_NETWORK.routerAddress}
                      </span>
                      <a
                        href={`${CURRENT_NETWORK.explorerUrl}/address/${CURRENT_NETWORK.routerAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#0a0a0a] underline underline-offset-4 hover:text-[#b64d31]"
                      >
                        <span>{t("common.viewOnExplorer")}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-[12px] bg-[#f5f0e0] border border-[#e5e5e5] text-xs text-[#6a6a6a] italic">
                      {t("common.contractNotConfigured")}
                    </div>
                  )}
                </div>

                <p className="text-xs text-[#3a3a3a] leading-relaxed">
                  {isConfiguredAddress(CURRENT_NETWORK.routerAddress) ? (
                    <a
                      href={`${CURRENT_NETWORK.explorerUrl}/address/${CURRENT_NETWORK.routerAddress}#code`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0a0a0a] font-medium underline underline-offset-4 hover:text-[#b64d31]"
                    >
                      {lang === "hi"
                        ? "Snowtrace पर प्रकाशित स्रोत कोड (समान-मिलान सत्यापन)"
                        : "Source code published on Snowtrace (similar-match verification)"}
                    </a>
                  ) : (
                    <span>
                      {lang === "hi"
                        ? "Snowtrace पर प्रकाशित स्रोत कोड (समान-मिलान सत्यापन)"
                        : "Source code published on Snowtrace (similar-match verification)"}
                    </span>
                  )}
                  {lang === "hi"
                    ? "। अनुबंध केवल टेस्टनेट USDC रूटिंग को संभालता है। प्रोटोकॉल शुल्क वर्तमान में 0% है। अनुबंध स्वामी भविष्य के भुगतानों के लिए शुल्क निर्धारित कर सकता है, जो कोड में 1% पर सीमित है।"
                    : ". Contract handles testnet USDC routing only. Protocol fee is currently 0%. The contract owner can set a fee for future payments, capped in code at 1%."}
                </p>

                <div className="p-3.5 rounded-[12px] bg-[#faf5e8] border border-[#e5e5e5] text-xs font-mono text-[#3a3a3a] flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-[#b64d31] shrink-0" />
                  <span>
                    Indicative demo reference: 1 USDC ≈ ₹{INDICATIVE_USD_TO_INR_RATE.toFixed(2)} INR (illustrative demo rate, not a live rate)
                  </span>
                </div>

                <Link href="/app" prefetch={false} className="clay-btn-primary w-full">
                  <span>
                    {lang === "hi" ? "व्यापारी पोर्टल खोलें" : "Launch Merchant Portal"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Planned Roadmap + Bottom CTA Box */}
      <section className="py-14 sm:py-16 lg:py-20">
        <div className="page-container">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10">
            <div className="space-y-1.5">
              <div className="nyc-kicker">
                {lang === "hi" ? "भविष्य की योजनाएं" : "Future Milestones"}
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-display font-medium text-[#0a0a0a]">
                {lang === "hi" ? (
                  <>
                    नियोजित{" "}
                    <span className="font-editorial nyc-accent-terra">
                      रोडमैप
                    </span>
                  </>
                ) : (
                  <>
                    Planned{" "}
                    <span className="font-editorial nyc-accent-terra">
                      Roadmap
                    </span>
                  </>
                )}
              </h2>
            </div>
            <p className="text-xs text-[#6a6a6a] max-w-sm">
              Future development milestones. Each item is strictly labeled: planned, not built.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {roadmapItems.map((item, idx) => (
              <div
                key={idx}
                className="bg-[#f5f0e0] rounded-[20px] p-6 h-full flex flex-col justify-between space-y-3 border border-[#e5e5e5] hover:border-[#0a0a0a] nyc-card-lift"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-lg font-display font-medium text-[#0a0a0a]">
                    {item.title}
                  </h3>
                  <span className="wk-date shrink-0">
                    <b>Status</b>
                    <i>{item.status}</i>
                  </span>
                </div>
                <p className="text-sm text-[#3a3a3a] leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Bottom CTA Banner (matches "Ready to build your first AI project?" on ai.nexgendigital.tech) */}
          <div className="mt-14 sm:mt-16 bg-[#faf5e8] border border-[#e5e5e5] rounded-[24px] p-6 sm:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-1.5 max-w-lg">
              <h2 className="text-2xl sm:text-3xl font-display font-medium text-[#0a0a0a]">
                {lang === "hi" ? (
                  <>
                    अपना पहला{" "}
                    <span className="font-editorial nyc-accent-forest">
                      USDC चालान आज़माएं?
                    </span>
                  </>
                ) : (
                  <>
                    Ready to try{" "}
                    <span className="font-editorial nyc-accent-forest">
                      non-custodial invoicing?
                    </span>
                  </>
                )}
              </h2>
              <p className="text-sm text-[#3a3a3a]">
                {lang === "hi"
                  ? "टेस्ट वॉलेट से व्यापारी पोर्टल खोलें या बिना वॉलेट के नमूना चालान देखें।"
                  : "Open the merchant portal on Avalanche Fuji or explore the interactive sample invoice."}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
              <Link
                href="/app"
                prefetch={false}
                className="clay-btn-primary w-full sm:w-auto"
              >
                <span>
                  {lang === "hi" ? "व्यापारी पोर्टल खोलें" : "Launch Merchant Portal"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/demo" className="clay-btn-secondary w-full sm:w-auto">
                <span>
                  {lang === "hi" ? "नमूना चालान आज़माएं" : "Try a Sample Invoice"}
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
