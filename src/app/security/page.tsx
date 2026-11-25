"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Lock, Layers } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function SecurityPage() {
  const { lang } = useI18n();
  const securityEmail = process.env.SECURITY_CONTACT_EMAIL;

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
            {lang === "hi" ? "आर्किटेक्चर" : "Architecture"}
          </div>
          <h1 className="text-3xl sm:text-5xl font-display font-medium tracking-[-0.04em] text-[#0a0a0a]">
            {lang === "hi"
              ? "आर्किटेक्चर और तकनीकी सिद्धांत"
              : "Technical Architecture & Principles"}
          </h1>
          <p className="text-base text-[#3a3a3a] leading-relaxed">
            {lang === "hi"
              ? "शून्य कस्टडी और प्रत्यक्ष पीयर-टू-पीयर लेनदेन के लिए CryptoDao का तकनीकी डिज़ाइन।"
              : "How CryptoDao is architected for zero custody and peer-to-peer transaction integrity on Avalanche Fuji."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="clay-card-peach space-y-2.5">
            <div className="flex items-center gap-2 font-display font-medium text-[#0a0a0a] text-lg">
              <Lock className="w-4 h-4 text-[#0a0a0a]" />
              <span>{lang === "hi" ? "शून्य फंड कस्टडी" : "Zero Fund Custody"}</span>
            </div>
            <p className="text-sm text-[#1a1a1a] leading-relaxed">
              {lang === "hi"
                ? "PaymentRouter स्मार्ट अनुबंध हर समय शून्य बैलेंस रखता है। फंड सीधे भुगतानकर्ता और विक्रेता के बीच स्थानांतरित होते हैं।"
                : "The PaymentRouter smart contract holds zero balances at all times. Transfers execute directly between payer and merchant."}
            </p>
          </div>

          <div className="clay-card-teal space-y-2.5">
            <div className="flex items-center gap-2 font-display font-medium text-white text-lg">
              <Layers className="w-4 h-4 text-[#a4d4c5]" />
              <span>
                {lang === "hi"
                  ? "एंटी-ग्रीफिंग डायरेक्ट रूटिंग"
                  : "Anti-Griefing Direct Routing"}
              </span>
            </div>
            <p className="text-sm text-[#f0f0f0] leading-relaxed">
              {lang === "hi"
                ? "चालान निपटान लेखांकन ऑफ-चेन किया जाता है, जो ऑन-चेन फ्रंट-रनिंग माइक्रो-भुगतान सेवा-अस्वीकृति हमलों को समाप्त करता है।"
                : "Invoice settlement accounting is performed off-chain, eliminating on-chain front-running micro-payment denial-of-service vectors."}
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-8 rounded-[22px] bg-[#f5f0e0] border border-[#e5e5e5] space-y-3 text-xs text-[#3a3a3a]">
          <div className="font-display font-medium text-[#0a0a0a] text-base">
            {lang === "hi"
              ? "सुरक्षा नियंत्रण और निगरानी स्थिति"
              : "Security Controls & Observability Status"}
          </div>
          <ul className="space-y-2 list-disc list-inside leading-relaxed">
            <li>
              <strong className="text-[#0a0a0a]">
                {lang === "hi" ? "त्रुटि निगरानी: " : "Error Monitoring: "}
              </strong>
              {lang === "hi"
                ? "PII स्क्रबर लागू किया गया है; त्रुटि निगरानी अभी सक्रिय नहीं है (कोई Sentry.init नहीं)।"
                : "PII scrubber implemented; error monitoring is NOT active yet (no Sentry.init)."}
            </li>
            <li>
              <strong className="text-[#0a0a0a]">
                {lang === "hi"
                  ? "कंटेंट सुरक्षा नीति (CSP): "
                  : "Content Security Policy (CSP): "}
              </strong>
              {lang === "hi"
                ? "Report-Only, जिसमें 'unsafe-eval'/'unsafe-inline' शामिल है; अभी लागू नहीं किया गया है।"
                : "Report-Only, includes 'unsafe-eval'/'unsafe-inline'; not yet enforcing."}
            </li>
            <li>
              <strong className="text-[#0a0a0a]">
                {lang === "hi" ? "निर्भरता स्थिति: " : "Dependency Hygiene: "}
              </strong>
              {lang === "hi"
                ? "25 निष्कर्ष (prisma CLI में 3 उच्च, वॉलेट स्टैक में 22 मध्यम)। रनटाइम पर prisma CLI कोड अप्रभावित।"
                : "25 total vulnerabilities in npm audit (3 high in prisma CLI, 22 moderate in wallet stack); prisma CLI findings not shown reachable at runtime; wallet findings not verified."}
            </li>
          </ul>
        </div>

        <div className="p-6 sm:p-8 rounded-[22px] bg-[#faf5e8] border border-[#e5e5e5] space-y-2 text-xs text-[#3a3a3a]">
          <div className="font-display font-medium text-[#0a0a0a] text-base">
            {lang === "hi" ? "तकनीकी रिपोर्टिंग" : "Technical Reporting"}
          </div>
          <p className="leading-relaxed">
            {securityEmail ? (
              <>
                {lang === "hi"
                  ? "संभावित तकनीकी समस्या मिली? कृपया संपर्क करें: "
                  : "Discovered a potential technical issue? Please report to "}
                <code className="font-mono bg-[#f5f0e0] text-[#0a0a0a] px-1.5 py-0.5 rounded border border-[#e5e5e5]">
                  {securityEmail}
                </code>
                .
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
    </div>
  );
}
