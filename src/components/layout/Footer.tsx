"use client";

import React from "react";
import Link from "next/link";
import { BRANDING } from "@/config/branding";
import { CURRENT_NETWORK } from "@/config/network";
import { useI18n } from "@/lib/i18n";
import { ExternalLink, Shield } from "lucide-react";

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-xs text-slate-500 dark:text-slate-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & Value Prop */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-slate-900 dark:text-white">
                {BRANDING.name} ({BRANDING.devanagariName})
              </span>
              <span className="bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 text-[10px] px-2 py-0.5 rounded-full font-medium">
                {CURRENT_NETWORK.name}
              </span>
            </div>
            <p className="max-w-md leading-relaxed text-slate-600 dark:text-slate-400">
              {t("footer.tagline")}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
              <Shield className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
              <span>{t("footer.smartContractsLabel")}</span>
            </div>
          </div>

          {/* Protocol Links */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
              {t("footer.protocol")}
            </h3>
            <ul className="space-y-1">
              <li>
                <Link href="/about/how-it-works" className="inline-flex items-center min-h-[32px] py-1 text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 transition-colors">
                  {t("nav.howItWorks")}
                </Link>
              </li>
              <li>
                <Link href="/security" className="inline-flex items-center min-h-[32px] py-1 text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 transition-colors">
                  {t("nav.security")}
                </Link>
              </li>
              <li>
                <a
                  href={
                    CURRENT_NETWORK.routerAddress
                      ? `${CURRENT_NETWORK.explorerUrl}/address/${CURRENT_NETWORK.routerAddress}`
                      : CURRENT_NETWORK.explorerUrl
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 min-h-[32px] py-1 text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
                >
                  {t("common.viewOnExplorer")} <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Disclaimers (Drafts pending lawyer review) */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
              {t("footer.legal")}
            </h3>
            <ul className="space-y-1">
              <li>
                <Link href="/legal/terms" className="inline-flex items-center min-h-[32px] py-1 text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 transition-colors">
                  {t("footer.terms")}
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="inline-flex items-center min-h-[32px] py-1 text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 transition-colors">
                  {t("footer.privacy")}
                </Link>
              </li>
              <li>
                <Link href="/legal/risks" className="inline-flex items-center min-h-[32px] py-1 text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 transition-colors">
                  {t("footer.risks")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer Notice */}
        <div className="pt-6 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <p className="text-[11px] max-w-2xl text-slate-600 dark:text-slate-400">
            {t("footer.disclaimer")}
          </p>
          <div className="text-[11px] text-slate-600 dark:text-slate-400">
            {t("footer.copyright")}
          </div>
        </div>
      </div>
    </footer>
  );
}
