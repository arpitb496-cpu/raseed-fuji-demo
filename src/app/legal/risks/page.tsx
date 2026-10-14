"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function RisksPage() {
  const { lang } = useI18n();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 rounded"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>{lang === "hi" ? "मुखपृष्ठ पर वापस जाएं" : "Back to Home"}</span>
      </Link>

      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <p className="font-medium">
          {lang === "hi"
            ? "डेमो सूचना (DEMO NOTICE): यह एक टेस्टनेट डेमो सूचना है, अंतिम कानूनी शर्तें नहीं। CryptoDao केवल तकनीकी मूल्यांकन और साझेदारी चर्चाओं के लिए एवलांच फूजी टेस्टनेट पर संचालित है। कोई वास्तविक धन शामिल नहीं है।"
            : "DEMO NOTICE — NOT FINAL LEGAL TERMS: This is a testnet demo notice, not final legal terms. CryptoDao is configured strictly on Avalanche Fuji testnet for evaluation and partnership discussions. No real funds are involved."}
        </p>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        {lang === "hi" ? "जोखिम प्रकटीकरण (डेमो सूचना)" : "Risk Disclosures (Demo Notice)"}
      </h1>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          {lang === "hi" ? "1. सेल्फ-कस्टडी और की प्रबंधन" : "1. Self-Custody & Key Management"}
        </h2>
        <p>
          {lang === "hi"
            ? "आप अपनी निजी कुंजियों और सीड वाक्यांशों की गोपनीयता बनाए रखने के लिए पूरी तरह जिम्मेदार हैं। एवलांच फूजी टेस्टनेट पर पुष्ट होने के बाद CryptoDao के पास खोई हुई कुंजियों को पुनः प्राप्त करने या लेनदेन को उलटने की कोई क्षमता नहीं है।"
            : "You are solely responsible for maintaining the confidentiality of your private keys and seed phrases. CryptoDao has no ability to recover lost keys, cancel sent transactions, or reverse transfers once confirmed on Avalanche Fuji testnet."}
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          {lang === "hi" ? "2. स्मार्ट अनुबंध एवं टेस्टनेट जोखिम" : "2. Smart Contract & Testnet Risk"}
        </h2>
        <p>
          {lang === "hi"
            ? "जबकि PaymentRouter कभी फंड नहीं रखता और टोकन को सीधे स्थानांतरित करता है, सभी स्मार्ट अनुबंधों में सॉफ्टवेयर दोषों या RPC बाधाओं के तकनीकी जोखिम होते हैं। फूजी टेस्टनेट पर अनुबंध केवल टेस्टनेट टोकन के साथ परीक्षण उद्देश्यों के लिए हैं। सॉफ्टवेयर वित्तीय सलाह के बिना 'जैसा है' आधार पर प्रदान किया जाता है।"
            : "While PaymentRouter is designed to never hold funds and transfers tokens atomically from payer to merchant, all smart contracts carry technical risks of software defects or RPC disruption. Contracts deployed on Fuji testnet are for testing purposes only with testnet tokens. Software is provided strictly as-is without financial or legal advice."}
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          {lang === "hi" ? "3. स्टेबलकॉइन पेग और नियामक नियंत्रण" : "3. Stablecoin Peg & Circle Regulatory Controls"}
        </h2>
        <p>
          {lang === "hi"
            ? "USDC को Circle Internet Financial, LLC द्वारा जारी किया जाता है। सर्कल कानूनी प्रक्रिया के अधीन विशिष्ट वॉलेट पतों को ब्लॉक करने सहित प्रशासनिक क्षमताओं को बरकरार रखता है।"
            : "USDC is issued by Circle Internet Financial, LLC. Circle retains administrative capabilities including smart contract upgrades and blocking of specific wallet addresses subject to legal process."}
        </p>
      </section>
    </div>
  );
}
