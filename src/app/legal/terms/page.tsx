"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function TermsPage() {
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
        <AlertCircle className="w-5 h-5 shrink-0" />
        <p className="font-medium">
          {lang === "hi"
            ? "डेमो सूचना (DEMO NOTICE): यह पृष्ठ एक टेस्टनेट डेमो सूचना है, अंतिम कानूनी शर्तें नहीं। रसीद केवल तकनीकी मूल्यांकन और साझेदारी चर्चाओं के लिए एवलांच फूजी टेस्टनेट पर संचालित है। इसमें कोई वास्तविक धन शामिल नहीं है, और यह सॉफ्टवेयर वित्तीय या कानूनी सलाह नहीं देता है।"
            : "DEMO NOTICE — NOT FINAL LEGAL TERMS: This page is a testnet demo notice, not final legal terms. Raseed is operating strictly on Avalanche Fuji testnet for evaluation and partnership discussions. No real funds are involved, and this software does not constitute financial or legal advice."}
        </p>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        {lang === "hi" ? "सेवा की शर्तें (डेमो सूचना)" : "Terms of Service (Demo Notice)"}
      </h1>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          {lang === "hi" ? "1. टेस्टनेट डेमो की प्रकृति" : "1. Nature of the Testnet Demo"}
        </h2>
        <p>
          {lang === "hi"
            ? "रसीद एवलांच फूजी टेस्टनेट पर पीयर-टू-पीयर स्टेबलकॉइन चालान के लिए प्रायोगिक, गैर-कस्टोडियल सॉफ्टवेयर इंटरफेस प्रदान करता है। रसीद उपयोगकर्ता फंड की कस्टडी नहीं लेता है, एस्क्रो एजेंट, मनी ट्रांसमीटर या बैंक के रूप में कार्य नहीं करता है, और कभी भी निजी कुंजियां नहीं रखता है।"
            : "Raseed provides experimental, non-custodial software interfaces for peer-to-peer testnet stablecoin invoicing on Avalanche Fuji. Raseed does not take custody of user funds, does not act as an escrow agent, money transmitter, bank, or custodian, and never possesses private keys."}
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          {lang === "hi" ? "2. कर एवं अनुपालन जिम्मेदारियां" : "2. Tax & Compliance Responsibilities"}
        </h2>
        <p>
          {lang === "hi"
            ? "व्यापारी और भुगतानकर्ता इस एप्लिकेशन के माध्यम से किए गए किसी भी चालान या लेनदेन से उत्पन्न होने वाले सभी लागू करों के निर्धारण, रिपोर्टिंग और भुगतान के लिए पूरी तरह से जिम्मेदार हैं।"
            : "Merchants and payers are solely and exclusively responsible for determining, reporting, and remitting all applicable taxes resulting from any invoices or transactions conducted via the application."}
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          {lang === "hi" ? "3. वित्तीय/कानूनी सलाह और वारंटी का अस्वीकरण" : "3. Disclaimer of Financial/Legal Advice & Warranties"}
        </h2>
        <p>
          {lang === "hi"
            ? "रसीद वित्तीय या कानूनी सलाह प्रदान नहीं करता है। स्टेबलकॉइन संदर्भ दरें केवल सांकेतिक हैं। डेमो सॉफ्टवेयर बिना किसी वारंटी के 'जैसा है' (as-is) आधार पर प्रदान किया जाता है।"
            : "Raseed does not offer financial or legal advice. Stablecoin reference rates are indicative only. The demo software is provided \"as is\" without warranties of any kind."}
        </p>
      </section>
    </div>
  );
}
