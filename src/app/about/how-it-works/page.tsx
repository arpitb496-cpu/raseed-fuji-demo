"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function HowItWorksPage() {
  const { lang } = useI18n();

  return (
    <div className="min-h-screen bg-[#fffaf0]">
      <div className="page-container py-12 sm:py-16 space-y-8 max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[#0a0a0a] hover:text-[#b64d31] font-medium rounded"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{lang === "hi" ? "मुखपृष्ठ पर वापस जाएं" : "Back to Home"}</span>
        </Link>

        <div className="space-y-3">
          <div className="nyc-kicker">
            {lang === "hi" ? "तीन-चरणीय प्रक्रिया" : "3-Step Process"}
          </div>
          <h1 className="text-3xl sm:text-5xl font-display font-medium tracking-[-0.04em] text-[#0a0a0a]">
            {lang === "hi" ? "CryptoDao कैसे काम करता है" : "How CryptoDao Works"}
          </h1>
          <p className="text-base text-[#3a3a3a] max-w-2xl leading-relaxed">
            {lang === "hi"
              ? "एवलांच फूजी टेस्टनेट पर गैर-कस्टोडियल, पीयर-टू-पीयर USDC चालान प्रणाली।"
              : "Non-custodial, peer-to-peer USDC invoicing on Avalanche Fuji testnet."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="clay-card-peach space-y-2.5">
            <div className="nyc-kicker !text-[#1a1a1a]">01</div>
            <h2 className="font-display font-medium text-[#0a0a0a] text-xl">
              {lang === "hi"
                ? "चरण 1: व्यापारी कनेक्ट होता है और चालान जारी करता है"
                : "Step 1: Merchant Connects & Issues Invoice"}
            </h2>
            <p className="text-sm text-[#1a1a1a] leading-relaxed">
              {lang === "hi"
                ? "व्यापारी Sign-In with Ethereum (SIWE) का उपयोग करके अपने Web3 वॉलेट से साइन इन करता है। कोई निजी कुंजी या कस्टोडियल क्रेडेंशियल्स कभी संग्रहीत नहीं होते हैं। व्यापारी लाइन आइटम, देय तिथि और राशि के साथ एक साझा करने योग्य भुगतान लिंक बनाता है।"
                : "The merchant signs in with their Web3 wallet using Sign-In with Ethereum (SIWE). No private keys or custody credentials are ever stored. The merchant generates a shareable payment link with line items and due date."}
            </p>
          </div>

          <div className="clay-card-teal space-y-2.5">
            <div className="nyc-kicker !text-[#a4d4c5]">02</div>
            <h2 className="font-display font-medium text-white text-xl">
              {lang === "hi"
                ? "चरण 2: भुगतानकर्ता कनेक्ट होता है और USDC में भुगतान करता है"
                : "Step 2: Payer Connects & Pays in USDC"}
            </h2>
            <p className="text-sm text-[#f0f0f0] leading-relaxed">
              {lang === "hi"
                ? "भुगतानकर्ता अप्रत्याशित लिंक खोलता है, नेटिव Circle USDC में सटीक चालान राशि को स्वीकृत करता है, और PaymentRouter स्मार्ट अनुबंध को कॉल करता है। फंड सीधे और तात्कालिक रूप से व्यापारी के वॉलेट में स्थानांतरित हो जाते हैं।"
                : "The payer opens the unguessable link, approves the exact invoice amount in native Circle USDC, and calls the PaymentRouter smart contract. Funds transfer atomically and directly into the merchant's wallet."}
            </p>
          </div>

          <div className="clay-card-lavender space-y-2.5">
            <div className="nyc-kicker !text-[#1a1a1a]">03</div>
            <h2 className="font-display font-medium text-[#0a0a0a] text-xl">
              {lang === "hi"
                ? "चरण 3: ऑन-चेन पुष्टिकरण और रसीदें"
                : "Step 3: On-Chain Confirmation & Receipts"}
            </h2>
            <p className="text-sm text-[#1a1a1a] leading-relaxed">
              {lang === "hi"
                ? "सर्वर कैनोनिकल एवलांच फूजी ब्लॉकचेन की निगरानी करता है, ऑन-चेन पुष्ट Paid ईवेंट का मिलान करता है, चालान की स्थिति को Paid में अपडेट करता है, और डाउनलोड करने योग्य PDF रसीदें और Snowtrace एक्सप्लोरर लिंक प्रदान करता है।"
                : "The server monitors the canonical Avalanche Fuji blockchain, matches the confirmed on-chain Paid event, updates the invoice status to Paid, and generates downloadable PDF receipts and Snowtrace explorer links."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
