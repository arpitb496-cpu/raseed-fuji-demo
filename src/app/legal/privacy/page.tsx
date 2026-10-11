"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function PrivacyPage() {
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
            ? "डेमो सूचना (DEMO NOTICE): यह पृष्ठ एक टेस्टनेट डेमो सूचना है, अंतिम कानूनी शर्तें नहीं। रसीद विशेष रूप से मूल्यांकन और साझेदारी चर्चाओं के लिए एवलांच फूजी टेस्टनेट पर कॉन्फ़िगर किया गया है। कोई वास्तविक धन शामिल नहीं है।"
            : "DEMO NOTICE — NOT FINAL LEGAL TERMS: This page is a testnet demo notice, not final legal terms. Raseed is configured strictly for evaluation and partnership discussions on Avalanche Fuji testnet. No real funds are involved."}
        </p>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        {lang === "hi" ? "गोपनीयता नीति (डेमो सूचना)" : "Privacy Policy (Demo Notice)"}
      </h1>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          {lang === "hi" ? "1. डेटा न्यूनीकरण" : "1. Data Minimization"}
        </h2>
        <p>
          {lang === "hi"
            ? "रसीद सख्त डेटा न्यूनीकरण का पालन करता है। हम पासवर्ड, पहचान दस्तावेज, फोन नंबर या व्यक्तिगत पहचान संख्या एकत्र नहीं करते हैं। चालान पर ग्राहक का नाम और ईमेल पूरी तरह वैकल्पिक हैं।"
            : "Raseed adheres to strict data minimization. We do not collect passwords, identity documents, phone numbers, or national identification numbers. Client names and emails on invoices are strictly optional."}
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          {lang === "hi" ? "2. ऑन-चेन पारदर्शिता" : "2. On-Chain Transparency"}
        </h2>
        <p>
          {lang === "hi"
            ? "एवलांच ब्लॉकचेन पर लेनदेन स्वाभाविक रूप से सार्वजनिक हैं। पेआउट पते, लेनदेन हैश और ईवेंट पैरामीटर स्नोब्रेस एक्सप्लोरर पर सार्वजनिक रूप से देखे जा सकते हैं।"
            : "Blockchain transactions on Avalanche Fuji are public by nature. Payout addresses, transaction hashes, and event parameters are publicly observable on Snowtrace."}
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          {lang === "hi" ? "3. व्यापारी डेटा अधिकार" : "3. Merchant Data Rights"}
        </h2>
        <p>
          {lang === "hi"
            ? "व्यापारी अपने चालान रिकॉर्ड को CSV प्रारूप में निर्यात कर सकते हैं या व्यापारी सेटिंग्स इंटरफ़ेस के माध्यम से किसी भी समय अपने प्रोफ़ाइल डेटा को स्थायी रूप से हटाने का अनुरोध कर सकते हैं।"
            : "Merchants may export their invoicing records in CSV format or permanently request data deletion at any time via the merchant settings interface."}
        </p>
      </section>
    </div>
  );
}
