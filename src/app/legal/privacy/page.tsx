"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function PrivacyPage() {
  const { lang } = useI18n();

  return (
    <div className="min-h-screen bg-[#fffaf0]">
      <div className="page-container py-12 sm:py-16 space-y-6 text-xs text-[#3a3a3a] leading-relaxed max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[#0a0a0a] hover:text-[#b64d31] font-medium rounded"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{lang === "hi" ? "मुखपृष्ठ पर वापस जाएं" : "Back to Home"}</span>
        </Link>

        <div className="p-5 rounded-[18px] bg-[#ffb084] border border-[#0a0a0a]/15 text-[#0a0a0a] flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="font-medium text-xs leading-relaxed">
            {lang === "hi"
              ? "डेमो सूचना (DEMO NOTICE): यह पृष्ठ एक टेस्टनेट डेमो सूचना है, अंतिम कानूनी शर्तें नहीं। CryptoDao विशेष रूप से मूल्यांकन और साझेदारी चर्चाओं के लिए एवलांच फूजी टेस्टनेट पर कॉन्फ़िगर किया गया है। कोई वास्तविक धन शामिल नहीं है।"
              : "DEMO NOTICE — NOT FINAL LEGAL TERMS: This page is a testnet demo notice, not final legal terms. CryptoDao is configured strictly for evaluation and partnership discussions on Avalanche Fuji testnet. No real funds are involved."}
          </p>
        </div>

        <h1 className="text-3xl sm:text-4xl font-display font-medium text-[#0a0a0a]">
          {lang === "hi" ? "गोपनीयता नीति (डेमो सूचना)" : "Privacy Policy (Demo Notice)"}
        </h1>

        <section className="p-6 rounded-[20px] bg-[#f5f0e0] border border-[#e5e5e5] space-y-2">
          <h2 className="text-base font-display font-medium text-[#0a0a0a]">
            {lang === "hi" ? "1. डेटा न्यूनीकरण" : "1. Data Minimization"}
          </h2>
          <p className="text-xs text-[#3a3a3a] leading-relaxed">
            {lang === "hi"
              ? "CryptoDao सख्त डेटा न्यूनीकरण का पालन करता है। हम पासवर्ड, पहचान दस्तावेज, फोन नंबर या व्यक्तिगत पहचान संख्या एकत्र नहीं करते हैं। चालान पर ग्राहक का नाम और ईमेल पूरी तरह वैकल्पिक हैं।"
              : "CryptoDao adheres to strict data minimization. We do not collect passwords, identity documents, phone numbers, or national identification numbers. Client names and emails on invoices are strictly optional."}
          </p>
        </section>

        <section className="p-6 rounded-[20px] bg-[#f5f0e0] border border-[#e5e5e5] space-y-2">
          <h2 className="text-base font-display font-medium text-[#0a0a0a]">
            {lang === "hi" ? "2. ऑन-चेन पारदर्शिता" : "2. On-Chain Transparency"}
          </h2>
          <p className="text-xs text-[#3a3a3a] leading-relaxed">
            {lang === "hi"
              ? "एवलांच ब्लॉकचेन पर लेनदेन स्वाभाविक रूप से सार्वजनिक हैं। पेआउट पते, लेनदेन हैश और ईवेंट पैरामीटर स्नोब्रेस एक्सप्लोरर पर सार्वजनिक रूप से देखे जा सकते हैं।"
              : "Blockchain transactions on Avalanche Fuji are public by nature. Payout addresses, transaction hashes, and event parameters are publicly observable on Snowtrace."}
          </p>
        </section>

        <section className="p-6 rounded-[20px] bg-[#f5f0e0] border border-[#e5e5e5] space-y-2">
          <h2 className="text-base font-display font-medium text-[#0a0a0a]">
            {lang === "hi" ? "3. व्यापारी डेटा अधिकार" : "3. Merchant Data Rights"}
          </h2>
          <p className="text-xs text-[#3a3a3a] leading-relaxed">
            {lang === "hi"
              ? "व्यापारी अपने चालान रिकॉर्ड को CSV प्रारूप में निर्यात कर सकते हैं या व्यापारी सेटिंग्स इंटरफ़ेस के माध्यम से किसी भी समय अपने प्रोफ़ाइल डेटा को स्थायी रूप से हटाने का अनुरोध कर सकते हैं।"
              : "Merchants may export their invoicing records in CSV format or permanently request data deletion at any time via the merchant settings interface."}
          </p>
        </section>
      </div>
    </div>
  );
}
