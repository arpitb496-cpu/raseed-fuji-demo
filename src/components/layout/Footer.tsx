"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRANDING } from "@/config/branding";
import { CURRENT_NETWORK, isConfiguredAddress } from "@/config/network";
import { useI18n } from "@/lib/i18n";
import { Receipt, ExternalLink, Shield } from "lucide-react";

export function Footer() {
  const pathname = usePathname();
  const { t, lang } = useI18n();

  if (pathname.startsWith("/app") || pathname.startsWith("/pay")) {
    return null;
  }

  return (
    <footer className="bg-[#faf5e8] text-[#3a3a3a] border-t border-[#e5e5e5] pt-12 sm:pt-14 pb-8 sm:pb-10 overflow-hidden mt-auto">
      <div className="page-container">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 pb-10 border-b border-[#e5e5e5]">
          {/* Brand Column (5 cols) */}
          <div className="sm:col-span-2 lg:col-span-5 space-y-3">
            <Link
              href="/"
              className="inline-flex items-center gap-3 text-xl font-display font-medium tracking-[-0.03em] text-[#0a0a0a]"
            >
              <span className="w-9 h-9 rounded-xl border border-[#e5e5e5] bg-white flex items-center justify-center shrink-0">
                <Receipt className="w-4 h-4 text-[#0a0a0a]" />
              </span>
              <span>{BRANDING.name}</span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#f5f0e0] border border-[#e5e5e5] text-[11px] font-medium text-[#3a3a3a]">
                {CURRENT_NETWORK.name}
              </span>
            </Link>
            <p className="text-sm text-[#3a3a3a] max-w-sm leading-relaxed">
              {t("footer.tagline")}
            </p>
            <div className="inline-flex items-center gap-2 text-xs text-[#6a6a6a]">
              <Shield className="w-3.5 h-3.5 text-[#173f32]" />
              <span>{t("footer.smartContractsLabel")}</span>
            </div>
          </div>

          {/* Explore Column (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="nyc-kicker !text-[#0a0a0a]">
              {lang === "hi" ? "एक्सप्लोर करें" : "Explore"}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/demo"
                  className="hover:text-[#0a0a0a] hover:underline underline-offset-4 transition-colors"
                >
                  {lang === "hi" ? "नमूना चालान" : "Sample Invoice"}
                </Link>
              </li>
              <li>
                <Link
                  href="/app"
                  prefetch={false}
                  className="hover:text-[#0a0a0a] hover:underline underline-offset-4 transition-colors"
                >
                  {t("nav.dashboard")}
                </Link>
              </li>
              <li>
                <Link
                  href="/about/how-it-works"
                  className="hover:text-[#0a0a0a] hover:underline underline-offset-4 transition-colors"
                >
                  {t("nav.howItWorks")}
                </Link>
              </li>
              <li>
                <Link
                  href="/security"
                  className="hover:text-[#0a0a0a] hover:underline underline-offset-4 transition-colors"
                >
                  {t("nav.security")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources Column (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="nyc-kicker !text-[#0a0a0a]">
              {t("footer.protocol")}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                {isConfiguredAddress(CURRENT_NETWORK.routerAddress) ? (
                  <a
                    href={`${CURRENT_NETWORK.explorerUrl}/address/${CURRENT_NETWORK.routerAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-[#0a0a0a] hover:underline underline-offset-4 transition-colors"
                  >
                    <span>{t("common.viewOnExplorer")}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-[#6a6a6a] italic text-xs">
                    {t("common.contractNotConfigured")}
                  </span>
                )}
              </li>
              <li>
                <span className="text-xs text-[#6a6a6a] font-mono">
                  Chain ID: {CURRENT_NETWORK.chain.id}
                </span>
              </li>
            </ul>
          </div>

          {/* Legal Column (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="nyc-kicker !text-[#0a0a0a]">
              {t("footer.legal")}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/legal/terms"
                  className="hover:text-[#0a0a0a] hover:underline underline-offset-4 transition-colors"
                >
                  {t("footer.terms")}
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/privacy"
                  className="hover:text-[#0a0a0a] hover:underline underline-offset-4 transition-colors"
                >
                  {t("footer.privacy")}
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/risks"
                  className="hover:text-[#0a0a0a] hover:underline underline-offset-4 transition-colors"
                >
                  {t("footer.risks")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Legal Notice & Copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6a6a6a] text-center sm:text-left">
          <p className="max-w-2xl leading-relaxed">{t("footer.disclaimer")}</p>
          <div className="shrink-0 flex flex-wrap items-center justify-center gap-3">
            <span>{t("footer.copyright")}</span>
            <span aria-hidden="true">·</span>
            <Link href="/legal/privacy" className="hover:text-[#0a0a0a] hover:underline">
              {t("footer.privacy")}
            </Link>
            <span aria-hidden="true">·</span>
            <Link href="/legal/terms" className="hover:text-[#0a0a0a] hover:underline">
              {t("footer.terms")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
