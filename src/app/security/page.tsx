"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Lock, Layers } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function SecurityPage() {
  const { lang } = useI18n();
  const securityEmail = process.env.SECURITY_CONTACT_EMAIL;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 rounded"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>{lang === "hi" ? "मुखपृष्ठ पर वापस जाएं" : "Back to Home"}</span>
      </Link>

      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {lang === "hi" ? "आर्किटेक्चर और तकनीकी सिद्धांत" : "Technical Architecture & Principles"}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {lang === "hi"
            ? "शून्य कस्टडी और प्रत्यक्ष पीयर-टू-पीयर लेनदेन के लिए रसीद का तकनीकी डिज़ाइन।"
            : "How Raseed is architected for zero custody and peer-to-peer transaction integrity on Avalanche Fuji."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white text-sm">
            <Lock className="w-4 h-4 text-teal-600" />
            <span>{lang === "hi" ? "शून्य फंड कस्टडी" : "Zero Fund Custody"}</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {lang === "hi"
              ? "PaymentRouter स्मार्ट अनुबंध हर समय शून्य बैलेंस रखता है। फंड सीधे भुगतानकर्ता और विक्रेता के बीच स्थानांतरित होते हैं।"
              : "The PaymentRouter smart contract holds zero balances at all times. Transfers execute directly between payer and merchant."}
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white text-sm">
            <Layers className="w-4 h-4 text-teal-600" />
            <span>{lang === "hi" ? "स्टेटलेस एंटी-ग्रीफिंग" : "Stateless Anti-Griefing Routing"}</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {lang === "hi"
              ? "चालान निपटान लेखांकन ऑफ-चेन किया जाता है, जो ऑन-चेन फ्रंट-रनिंग माइक्रो-भुगतान सेवा-अस्वीकृति हमलों को समाप्त करता है।"
              : "Invoice settlement accounting is performed off-chain, eliminating on-chain front-running micro-payment denial-of-service vectors."}
          </p>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-400">
        <div className="font-semibold text-slate-900 dark:text-white text-sm">
          {lang === "hi" ? "तकनीकी रिपोर्टिंग" : "Technical Reporting"}
        </div>
        <p>
          {securityEmail ? (
            <>
              {lang === "hi"
                ? "संभावित तकनीकी समस्या मिली? कृपया संपर्क करें: "
                : "Discovered a potential technical issue? Please report to "}
              <code className="font-mono">{securityEmail}</code>.
            </>
          ) : (
            <>
              {lang === "hi"
                ? "तकनीकी संपर्क विवरण जल्द ही उपलब्ध होंगे (टेस्टनेट डेमो चरण)।"
                : "Technical contact details coming soon (testnet demo phase)."}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
