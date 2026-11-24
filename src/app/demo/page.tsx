"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Receipt, RotateCcw } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { formatMicroUsdc } from "@/lib/currency";

const COPY = {
  en: {
    heading: "From invoice to payment receipt.",
    intro:
      "A freelancer completes a website project for 250 USDC. Follow the deposit and final payment through one invoice.",
    notice:
      "Interactive sample with fictional data. All payments on this page are simulated in your browser.",
    invoice: "Sample invoice",
    title: "Website design and localisation",
    merchant: "From Studio Asha",
    client: "For Sample Client",
    description: "Service",
    amount: "Amount",
    design: "Website design",
    localisation: "Hindi localisation",
    total: "Invoice total",
    received: "Sample payments received",
    remaining: "Remaining balance",
    status: ["Awaiting payment", "Partially paid", "Paid in sample"],
    stepTitle: [
      "An invoice your client can pay",
      "A deposit counts toward the same invoice",
      "Every payment adds up to one receipt",
    ],
    stepBody: [
      "The merchant creates an itemised invoice and shares a payment link. The client can review the amount and recipient before connecting a wallet.",
      "The sample client pays 100 USDC first. The invoice stays open with 150 USDC remaining. In the live app, the server checks payment events from the configured router before updating the invoice.",
      "The final 150 USDC completes the 250 USDC invoice. In the live app, confirmed payments are recorded against the invoice and the payer can download a receipt.",
    ],
    actions: ["Simulate 100 USDC deposit", "Simulate remaining 150 USDC"],
    restart: "Restart sample",
    history: "Sample payment history",
    deposit: "Deposit",
    finalPayment: "Final payment",
    receipt: "Sample receipt",
    receiptNote: "250 USDC invoice settled by two simulated payments.",
    liveTitle: "Try it on Avalanche Fuji",
    liveBody:
      "Open the merchant portal with a test wallet to create your own invoice. Fuji AVAX covers transaction gas and test USDC is used for payment.",
    launch: "Open merchant portal",
    code: "Explore the source code",
  },
  hi: {
    heading: "चालान से भुगतान की रसीद तक।",
    intro:
      "एक फ्रीलांसर ने 250 USDC का वेबसाइट प्रोजेक्ट पूरा किया। एक ही चालान पर अग्रिम और अंतिम भुगतान का उदाहरण देखें।",
    notice:
      "काल्पनिक डेटा वाला इंटरैक्टिव उदाहरण। इस पेज के सभी भुगतान आपके ब्राउज़र में सिमुलेट किए जाते हैं।",
    invoice: "नमूना चालान",
    title: "वेबसाइट डिज़ाइन और स्थानीयकरण",
    merchant: "Studio Asha की ओर से",
    client: "Sample Client के लिए",
    description: "सेवा",
    amount: "राशि",
    design: "वेबसाइट डिज़ाइन",
    localisation: "हिन्दी स्थानीयकरण",
    total: "चालान की कुल राशि",
    received: "नमूने में प्राप्त भुगतान",
    remaining: "बाकी राशि",
    status: ["भुगतान की प्रतीक्षा", "आंशिक भुगतान", "नमूने में भुगतान पूरा"],
    stepTitle: [
      "ग्राहक को भुगतान लिंक भेजें",
      "अग्रिम भुगतान इसी चालान में जुड़ता है",
      "सभी भुगतान एक रसीद में जुड़ते हैं",
    ],
    stepBody: [
      "विक्रेता सेवाओं का चालान बनाता है और भुगतान लिंक साझा करता है। ग्राहक वॉलेट जोड़ने से पहले राशि और प्राप्तकर्ता देख सकता है।",
      "नमूने में ग्राहक पहले 100 USDC देता है। चालान में 150 USDC बाकी रहते हैं। लाइव ऐप स्थिति बदलने से पहले निर्धारित राउटर के भुगतान ईवेंट जांचता है।",
      "अंतिम 150 USDC से 250 USDC का चालान पूरा होता है। लाइव ऐप पुष्ट भुगतान चालान में दर्ज करता है और ग्राहक रसीद डाउनलोड कर सकता है।",
    ],
    actions: ["100 USDC अग्रिम भुगतान सिमुलेट करें", "बाकी 150 USDC सिमुलेट करें"],
    restart: "उदाहरण फिर शुरू करें",
    history: "नमूने में भुगतान का इतिहास",
    deposit: "अग्रिम भुगतान",
    finalPayment: "अंतिम भुगतान",
    receipt: "नमूना रसीद",
    receiptNote: "दो सिमुलेट किए गए भुगतानों से 250 USDC का चालान पूरा हुआ।",
    liveTitle: "Avalanche Fuji पर आज़माएं",
    liveBody:
      "अपना चालान बनाने के लिए टेस्ट वॉलेट के साथ व्यापारी पोर्टल खोलें। गैस के लिए Fuji AVAX और भुगतान के लिए टेस्ट USDC का उपयोग होता है।",
    launch: "व्यापारी पोर्टल खोलें",
    code: "सोर्स कोड देखें",
  },
};

const SAMPLE_PAYMENTS = [100_000_000n, 150_000_000n];
const TOTAL = 250_000_000n;

export default function DemoPage() {
  const { lang } = useI18n();
  const copy = COPY[lang];
  const [step, setStep] = useState(0);
  const payments = SAMPLE_PAYMENTS.slice(0, step);
  const received = payments.reduce((sum, amount) => sum + amount, 0n);
  const remaining = TOTAL - received;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 md:py-16">
      <header className="max-w-3xl space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-pearl-ink sm:text-5xl">
          {copy.heading}
        </h1>
        <p className="text-base leading-relaxed text-pearl-muted sm:text-lg">
          {copy.intro}
        </p>
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {copy.notice}
        </p>
      </header>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section
          aria-label={copy.invoice}
          className="overflow-hidden rounded-3xl border border-pearl-border bg-white shadow-pearl-card"
        >
          <div className="border-b border-pearl-border p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-pearl-indigo">
                <Receipt size={18} /> {copy.invoice}
              </span>
              <span
                data-testid="sample-status"
                className="rounded-full bg-pearl-bg px-3 py-1.5 text-xs font-semibold text-pearl-ink"
              >
                {copy.status[step]}
              </span>
            </div>
            <h2 className="mt-6 text-2xl font-bold text-pearl-ink">
              {copy.title}
            </h2>
            <p className="mt-3 text-sm text-pearl-muted">{copy.merchant}</p>
            <p className="mt-1 text-sm text-pearl-subtle">{copy.client}</p>
          </div>
          <div className="p-6 sm:p-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-pearl-border text-pearl-subtle">
                  <th scope="col" className="pb-3 text-left font-medium">
                    {copy.description}
                  </th>
                  <th scope="col" className="pb-3 text-right font-medium">
                    {copy.amount}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-4 pr-3">{copy.design}</td>
                  <td className="whitespace-nowrap text-right font-mono">
                    200.00 USDC
                  </td>
                </tr>
                <tr>
                  <td className="pb-4 pr-3">{copy.localisation}</td>
                  <td className="whitespace-nowrap pb-4 text-right font-mono">
                    50.00 USDC
                  </td>
                </tr>
              </tbody>
            </table>
            <dl className="space-y-3 border-t border-pearl-border pt-5 text-sm">
              <div className="flex justify-between gap-3">
                <dt>{copy.total}</dt>
                <dd className="font-mono font-semibold">
                  {formatMicroUsdc(TOTAL)} USDC
                </dd>
              </div>
              <div className="flex justify-between gap-3 text-pearl-muted">
                <dt>{copy.received}</dt>
                <dd
                  data-testid="sample-received"
                  className="whitespace-nowrap font-mono"
                >
                  {formatMicroUsdc(received)} USDC
                </dd>
              </div>
              <div className="flex justify-between gap-3 rounded-xl bg-pearl-bg p-4 font-semibold">
                <dt>{copy.remaining}</dt>
                <dd
                  data-testid="sample-remaining"
                  className="whitespace-nowrap font-mono"
                >
                  {formatMicroUsdc(remaining)} USDC
                </dd>
              </div>
            </dl>
            {payments.length > 0 && (
              <div className="mt-6 border-t border-pearl-border pt-5">
                <h3 className="text-sm font-semibold">{copy.history}</h3>
                <ul className="mt-3 space-y-3 text-sm text-pearl-muted">
                  {payments.map((amount, index) => (
                    <li key={index} className="flex justify-between gap-3">
                      <span>
                        {index === 0 ? copy.deposit : copy.finalPayment}
                      </span>
                      <span className="whitespace-nowrap font-mono">
                        {formatMicroUsdc(amount)} USDC
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-6 rounded-3xl border border-pearl-border bg-white p-6 shadow-pearl-card sm:p-8">
          <div aria-live="polite" aria-atomic="true" className="space-y-4">
            <h2 className="text-2xl font-bold text-pearl-ink">
              {copy.stepTitle[step]}
            </h2>
            <p className="text-sm leading-relaxed text-pearl-muted">
              {copy.stepBody[step]}
            </p>
            {step === 2 && (
              <div className="rounded-2xl bg-pearl-success-bg p-5 text-pearl-success-text">
                <h3 className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 size={20} />
                  {copy.receipt}
                </h3>
                <p className="mt-2 text-sm leading-relaxed">
                  {copy.receiptNote}
                </p>
              </div>
            )}
          </div>
          {step < 2 && (
            <button
              onClick={() => setStep((current) => Math.min(current + 1, 2))}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-pearl-indigo px-4 py-3 text-sm font-semibold text-white hover:bg-pearl-indigo-hover"
            >
              {copy.actions[step]}
              <ArrowRight size={17} className="shrink-0" />
            </button>
          )}
          <button
            onClick={() => setStep(0)}
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-pearl-muted hover:text-pearl-indigo"
          >
            <RotateCcw size={16} />
            {copy.restart}
          </button>
        </section>
      </div>

      <section className="mt-8 flex flex-col justify-between gap-5 rounded-3xl border border-pearl-border bg-white p-6 sm:p-8 md:flex-row md:items-center">
        <div className="max-w-xl space-y-2">
          <h2 className="text-xl font-bold">{copy.liveTitle}</h2>
          <p className="text-sm leading-relaxed text-pearl-muted">
            {copy.liveBody}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-3">
          <Link
            href="/app"
            prefetch={false}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-pearl-indigo px-5 py-3 text-sm font-semibold text-white hover:bg-pearl-indigo-hover"
          >
            {copy.launch}
            <ArrowRight size={17} />
          </Link>
          <a
            href="https://github.com/arpitb496-cpu/raseed-fuji-demo"
            className="inline-flex min-h-11 items-center text-sm font-medium text-pearl-indigo underline underline-offset-4"
          >
            {copy.code}
          </a>
        </div>
      </section>
    </div>
  );
}
