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
  ExternalLink,
} from "lucide-react";

export default function HomePage() {
  const { t, lang } = useI18n();

  return (
    <div className="flex-1 flex flex-col bg-[#F2F4FB]">
      {/* 1. Hero & Value Proposition */}
      <section className="relative overflow-hidden pt-10 pb-16 md:pt-16 md:pb-24 border-b border-[#E6E9F5]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          {/* Value Proposition Badge */}
          <div className="flex items-center justify-center">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EEF2FF] border border-[#C7D2FE] text-[#4338CA] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-[#4338CA]" />
              <span>
                {lang === "hi"
                  ? "एवलांच फूजी टेस्टनेट पर गैर-कस्टोडियल चालान"
                  : "Non-Custodial USDC Invoicing on Avalanche Fuji"}
              </span>
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#161A3A] max-w-4xl mx-auto leading-tight">
            {lang === "hi" ? (
              <>
                सीधे अपने वॉलेट में{" "}
                <span className="text-[#4338CA] underline decoration-[#C7D2FE] underline-offset-8">
                  USDC भुगतान
                </span>{" "}
                प्राप्त करें।
              </>
            ) : (
              <>
                Get paid in USDC. Funds go{" "}
                <span className="text-[#4338CA] underline decoration-[#C7D2FE] underline-offset-8">
                  straight to your wallet.
                </span>
              </>
            )}
          </h1>

          {/* One-Line Value Proposition */}
          <p className="text-base sm:text-lg md:text-xl text-[#4B517D] max-w-3xl mx-auto leading-relaxed">
            {lang === "hi"
              ? "Avalanche Fuji टेस्टनेट पर नॉन-कस्टोडियल पीयर-टू-पीयर USDC इनवॉइसिंग ऐप — राशि बिना किसी मध्यस्थ कस्टडी के सीधे भुगतानकर्ता से विक्रेता के वॉलेट में जाती है।"
              : "Non-custodial USDC invoicing app on Avalanche Fuji testnet — funds transfer directly from payer to merchant with zero intermediary custody."}
          </p>

          {/* Indicative Rate Reference */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E6E9F5] text-[#5B6190] text-xs font-mono shadow-2xs">
            <Info className="w-3.5 h-3.5 text-[#5B6190]" />
            <span>
              Indicative demo reference: 1 USDC ≈ ₹{INDICATIVE_USD_TO_INR_RATE.toFixed(2)} INR (illustrative demo rate, not a live rate)
            </span>
          </div>

          {/* Action CTAs */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/app"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[48px] rounded-xl bg-[#4338CA] hover:bg-[#2E259B] text-white font-semibold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#4338CA] focus:ring-offset-1 shadow-2xs cursor-pointer"
            >
              <span>{lang === "hi" ? "व्यापारी पोर्टल खोलें" : "Launch Merchant Portal"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/about/how-it-works"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] rounded-xl border border-[#E6E9F5] bg-white hover:bg-[#F2F4FB] text-[#161A3A] font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#4338CA] focus:ring-offset-1 shadow-2xs cursor-pointer"
            >
              <span>{t("nav.howItWorks")}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Three-Step How It Works */}
      <section className="py-14 border-b border-[#E6E9F5]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-[#161A3A]">
              {lang === "hi" ? "यह कैसे काम करता है (3 चरण)" : "How It Works (3 Steps)"}
            </h2>
            <p className="text-xs text-[#5B6190] max-w-xl mx-auto">
              {lang === "hi"
                ? "सरल, प्रत्यक्ष और बिना किसी कस्टोडियल मध्यस्थ के।"
                : "Simple, direct, and completely free of custodial intermediaries."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-[24px] bg-white border border-[#E6E9F5] shadow-[0_2px_8px_rgba(40,50,120,0.06)] space-y-3">
              <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] text-[#4338CA] font-bold flex items-center justify-center text-sm">
                1
              </div>
              <h3 className="font-bold text-sm text-[#161A3A]">
                {lang === "hi" ? "1. चालान बनाएं" : "1. Merchant Issues Invoice"}
              </h3>
              <p className="text-xs text-[#4B517D] leading-relaxed">
                {lang === "hi"
                  ? "विक्रेता SIWE वॉलेट लॉगिन करता है और लाइन आइटम, नियत तिथि व राशि के साथ भुगतान लिंक जनरेट करता है।"
                  : "Merchant signs in with SIWE wallet authentication and creates an invoice with line items, due date, and USDC amount."}
              </p>
            </div>

            <div className="p-6 rounded-[24px] bg-white border border-[#E6E9F5] shadow-[0_2px_8px_rgba(40,50,120,0.06)] space-y-3">
              <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] text-[#4338CA] font-bold flex items-center justify-center text-sm">
                2
              </div>
              <h3 className="font-bold text-sm text-[#161A3A]">
                {lang === "hi" ? "2. USDC में सीधा भुगतान" : "2. Payer Settles in USDC"}
              </h3>
              <p className="text-xs text-[#4B517D] leading-relaxed">
                {lang === "hi"
                  ? "भुगतानकर्ता लिंक या QR स्कैन करता है और Fuji पर PaymentRouter के माध्यम से सीधे विक्रेता को टोकन भेजता है।"
                  : "Payer opens the unguessable link or scans QR code, approves exact USDC, and settles directly to merchant via PaymentRouter on Fuji."}
              </p>
            </div>

            <div className="p-6 rounded-[24px] bg-white border border-[#E6E9F5] shadow-[0_2px_8px_rgba(40,50,120,0.06)] space-y-3">
              <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] text-[#4338CA] font-bold flex items-center justify-center text-sm">
                3
              </div>
              <h3 className="font-bold text-sm text-[#161A3A]">
                {lang === "hi" ? "3. ऑन-चेन पुष्टिकरण व रसीद" : "3. On-Chain Confirmation & Receipt"}
              </h3>
              <p className="text-xs text-[#4B517D] leading-relaxed">
                {lang === "hi"
                  ? "सर्वर ब्लॉकचेन पर पुष्ट भुगतान ईवेंट दर्ज करता है, स्थिति अपडेट करता है, और डाउनलोड करने योग्य PDF रसीद प्रदान करता है।"
                  : "Server detects confirmed blockchain payment event, updates invoice status, and renders downloadable PDF receipts with explorer links."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Architecture in Plain Words */}
      <section className="py-14 border-b border-[#E6E9F5]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-[#161A3A]">
              {lang === "hi" ? "आर्किटेक्चर: सरल शब्दों में" : "Architecture in Plain Words"}
            </h2>
            <p className="text-xs text-[#5B6190] max-w-2xl mx-auto">
              {lang === "hi"
                ? "डिज़ाइन से कोई कस्टडी नहीं। एप्लिकेशन कभी भी आपके फंड को नहीं रखता या रोकता नहीं है।"
                : "No custody by design. The application never holds, pools, or delays your funds."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-[24px] bg-white border border-[#E6E9F5] shadow-[0_2px_8px_rgba(40,50,120,0.06)] space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#4338CA] flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-[#161A3A]">
                {lang === "hi" ? "गैर-कस्टोडियल ट्रांसफर" : "Direct Non-Custodial Transfer"}
              </h3>
              <p className="text-xs text-[#4B517D] leading-relaxed">
                {lang === "hi"
                  ? "फंड सीधे भुगतानकर्ता के वॉलेट से विक्रेता के वॉलेट में जाता है। कोई मध्यवर्ती पूल या एस्क्रो नहीं है।"
                  : "Payment flows directly from payer wallet to merchant wallet in a single atomic transaction. No intermediary escrow."}
              </p>
            </div>

            <div className="p-6 rounded-[24px] bg-white border border-[#E6E9F5] shadow-[0_2px_8px_rgba(40,50,120,0.06)] space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#4338CA] flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-[#161A3A]">
                {lang === "hi" ? "कॉन्ट्रैक्ट में शून्य बैलेंस" : "Contract Holds Zero Funds"}
              </h3>
              <p className="text-xs text-[#4B517D] leading-relaxed">
                {lang === "hi"
                  ? "PaymentRouter कॉन्ट्रैक्ट कभी भी फंड नहीं रखता। यह टोकन को भुगतानकर्ता से विक्रेता तक सीधे स्थानांतरित करता है और शून्य बैलेंस रखता है।"
                  : "The PaymentRouter smart contract never holds funds: it transfers tokens atomically from payer to merchant and keeps no token balance."}
              </p>
            </div>

            <div className="p-6 rounded-[24px] bg-white border border-[#E6E9F5] shadow-[0_2px_8px_rgba(40,50,120,0.06)] space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#4338CA] flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-[#161A3A]">
                {lang === "hi" ? "सर्वर पर कोई प्राइवेट की नहीं" : "No Server Key Custody"}
              </h3>
              <p className="text-xs text-[#4B517D] leading-relaxed">
                {lang === "hi"
                  ? "सर्वर कभी भी आपकी प्राइवेट की नहीं रखता। प्रमाणीकरण क्रिप्टोग्राफिक SIWE हस्ताक्षर द्वारा होता है।"
                  : "Web servers never store or access private keys. All actions are authenticated via cryptographic SIWE signatures."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. What Works Today (Tested, Working Features) */}
      <section className="py-14 border-b border-[#E6E9F5]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#D9F5E6] text-[#0B6B3A] text-[11px] font-semibold border border-[#A7F3D0]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{lang === "hi" ? "Fuji टेस्टनेट पर कार्यरत" : "Working on Fuji testnet"}</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-[#161A3A]">
              {lang === "hi" ? "आज क्या काम करता है" : "What Works Today"}
            </h2>
            <p className="text-xs text-[#5B6190] max-w-xl mx-auto">
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
                className="p-4 rounded-[20px] bg-white border border-[#E6E9F5] shadow-[0_2px_8px_rgba(40,50,120,0.04)] space-y-1.5"
              >
                <div className="flex items-center gap-2 font-bold text-sm text-[#161A3A]">
                  <CheckCircle2 className="w-4 h-4 text-[#0B6B3A] shrink-0" />
                  <span>{lang === "hi" ? f.titleHi : f.title}</span>
                </div>
                <p className="text-[#4B517D] text-xs leading-relaxed">
                  {lang === "hi" ? f.descHi : f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Fuji Router Contract Address */}
      <section className="py-10 border-b border-[#E6E9F5]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-6 rounded-[24px] border border-[#E6E9F5] bg-white shadow-[0_2px_8px_rgba(40,50,120,0.06)] space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E6E9F5] pb-3">
              <div className="flex items-center gap-2 font-bold text-[#161A3A]">
                <Layers className="w-4 h-4 text-[#4338CA]" />
                <span>Avalanche Fuji Testnet Deployment</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#FFE9D1] text-[#9A4B00] font-mono text-[10px] font-semibold border border-[#FED7AA] self-start sm:self-auto">
                Testnet Only (Chain ID: 43113)
              </span>
            </div>

            <div className="space-y-1 font-mono text-[11px]">
              <div className="text-[#5B6190]">PaymentRouter Contract:</div>
              <div className="flex flex-wrap items-center gap-2 text-[#161A3A] break-all font-semibold">
                <span>{CURRENT_NETWORK.routerAddress || "Not configured"}</span>
                {CURRENT_NETWORK.routerAddress && (
                  <a
                    href={`${CURRENT_NETWORK.explorerUrl}/address/${CURRENT_NETWORK.routerAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#4338CA] hover:text-[#2E259B] text-xs font-sans font-semibold"
                  >
                    <span>View on Snowtrace</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            <p className="text-[11px] text-[#5B6190]">
              <a
                href="https://testnet.snowtrace.io/address/0xb94A922261bBa2e07648520bf56125a4102eaB95#code"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#4338CA] hover:text-[#2E259B] underline font-semibold"
              >
                Source code published on Snowtrace (similar-match verification)
              </a>
              . Contract handles testnet USDC routing only. Protocol fee is currently 0%. The contract owner can set a fee for future payments, capped in code at 1%.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Calm Notice Card */}
      <section className="py-8 border-b border-[#E6E9F5]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-4 rounded-[20px] bg-white border border-[#E6E9F5] shadow-2xs text-center text-xs font-medium text-[#5B6190]">
            {lang === "hi"
              ? "टेस्टनेट डेमो (not audited)। वास्तविक धन के लिए नहीं।"
              : "Testnet demo. Not audited. Not for real funds."}
          </div>
        </div>
      </section>

      {/* 7. Roadmap (Each labeled "planned, not built") */}
      <section className="py-14 border-b border-[#E6E9F5]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-[#161A3A]">
              {lang === "hi" ? "रोडमैप (भविष्य की योजनाएं)" : "Planned Roadmap"}
            </h2>
            <p className="text-xs text-[#5B6190] max-w-xl mx-auto">
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
                className="p-5 rounded-[20px] bg-white border border-[#E6E9F5] shadow-[0_2px_8px_rgba(40,50,120,0.06)] space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-[#161A3A]">{item.title}</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#F2F4FB] text-[#5B6190] text-[10px] font-mono font-semibold shrink-0 border border-[#E6E9F5]">
                    {item.status}
                  </span>
                </div>
                <p className="text-[#4B517D] text-xs leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
