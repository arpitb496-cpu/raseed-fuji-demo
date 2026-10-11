import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock } from "lucide-react";
import { BRANDING } from "@/config/branding";

export default function SecurityPage() {
  const securityEmail = process.env.SECURITY_CONTACT_EMAIL;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-medium">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
      </Link>

      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Security Architecture & Principles
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          How Raseed is architected for zero custody and peer-to-peer transaction integrity.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white text-sm">
            <Lock className="w-4 h-4 text-teal-600" />
            <span>Zero Fund Custody</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            The PaymentRouter smart contract holds zero balances at all times. Transfers execute directly between payer and merchant.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white text-sm">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>Stateless Anti-Griefing</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Invoice settlement accounting is performed off-chain, eliminating on-chain front-running micro-payment denial-of-service vectors.
          </p>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-400">
        <div className="font-semibold text-slate-900 dark:text-white text-sm">Vulnerability Reporting</div>
        <p>
          {securityEmail ? (
            <>
              Discovered a potential vulnerability? Please report to{" "}
              <code className="font-mono-code">{securityEmail}</code>.
            </>
          ) : (
            <>contact details coming soon</>
          )}
        </p>
      </div>
    </div>
  );
}
