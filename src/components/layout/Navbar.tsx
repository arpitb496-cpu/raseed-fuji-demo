"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRANDING } from "@/config/branding";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { Receipt, Menu, X } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { t, lang } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (pathname.startsWith("/app") || pathname.startsWith("/pay")) {
    return null;
  }

  const navLinks = [
    { href: "/", label: t("nav.home"), match: (p: string) => p === "/" },
    {
      href: "/demo",
      label: lang === "hi" ? "नमूना चालान" : "Sample Invoice",
      match: (p: string) => p === "/demo",
    },
    {
      href: "/about/how-it-works",
      label: t("nav.howItWorks"),
      match: (p: string) => p === "/about/how-it-works",
    },
    {
      href: "/security",
      label: t("nav.security"),
      match: (p: string) => p === "/security",
    },
  ];

  return (
    <div className="sticky top-2.5 z-50 px-3 sm:px-3.5 pt-2.5 pointer-events-none">
      <header className="nyc-site-header pointer-events-auto relative mx-auto max-w-[1320px] h-[58px] sm:h-[62px] flex items-center justify-between gap-3 pl-3.5 pr-2 sm:pl-[18px] sm:pr-[9px]">
        {/* Brand Logo & Wordmark */}
        <Link
          href="/"
          aria-label={`${BRANDING.name} home`}
          className="flex items-center gap-2.5 shrink-0 py-1 group mr-auto"
        >
          <span className="w-[34px] h-[34px] sm:w-[38px] sm:h-[38px] rounded-[12px] bg-white border border-[#e5e5e5] flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-[1.04]">
            <Receipt className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#0a0a0a]" />
          </span>
          <span className="text-[16px] sm:text-[17.5px] font-medium tracking-[-0.035em] text-[#0a0a0a] whitespace-nowrap">
            {BRANDING.name}
          </span>
        </Link>

        {/* Desktop Pill Nav */}
        <nav
          aria-label="Main navigation"
          className="hidden lg:flex items-center gap-1"
        >
          {navLinks.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`px-[15px] py-[9px] rounded-full text-[15px] leading-[1.2] tracking-[-0.01em] whitespace-nowrap transition-colors ${
                  active
                    ? "bg-[#ebe6d6] text-[#0a0a0a] font-medium"
                    : "text-[#3a3a3a] font-normal hover:bg-[#f5f0e0] hover:text-[#0a0a0a]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          <div className="flex items-center gap-2 ml-2.5 pl-3 border-l border-[#e5e5e5]">
            <LanguageToggle />
            <Link
              href="/app"
              prefetch={false}
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-5 py-2.5 rounded-full bg-[#0a0a0a] hover:bg-[#1f1f1f] text-white text-[14.5px] font-medium tracking-[-0.01em] whitespace-nowrap transition-all hover:-translate-y-px cursor-pointer"
            >
              <span>{t("nav.dashboard")}</span>
            </Link>
          </div>
        </nav>

        {/* Mobile Controls: Language Toggle + Menu Pill */}
        <div className="flex lg:hidden items-center gap-2 shrink-0">
          <LanguageToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center gap-2 min-h-[42px] px-3.5 py-2 rounded-full bg-[#f5f0e0] hover:bg-[#ebe6d6] border border-[#e5e5e5] text-[14.5px] font-medium text-[#0a0a0a] cursor-pointer transition-colors"
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            <span>{lang === "hi" ? "मेनू" : "Menu"}</span>
            {mobileMenuOpen ? (
              <X className="w-4 h-4" />
            ) : (
              <Menu className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Mobile Floating Drawer (matches #main-nav.is-open on ai.nexgendigital.tech) */}
        {mobileMenuOpen && (
          <nav
            id="mobile-navigation"
            aria-label="Mobile navigation"
            className="lg:hidden absolute top-[calc(100%+10px)] right-0 left-0 sm:left-auto sm:w-[380px] bg-[#fffaf0] border border-[#0a0a0a] rounded-[22px] p-5 shadow-[0_22px_50px_rgba(10,10,10,0.16)] flex flex-col gap-1 z-50"
          >
            {navLinks.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`px-3 py-3 rounded-[12px] text-[20px] leading-[1.25] tracking-[-0.02em] transition-colors ${
                    active
                      ? "bg-[#f5f0e0] text-[#0a0a0a] font-medium"
                      : "text-[#0a0a0a] hover:bg-[#f5f0e0] hover:text-[#b64d31]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            <div className="mt-3 pt-4 border-t border-[#e5e5e5] flex items-center justify-between gap-3">
              <Link
                href="/app"
                prefetch={false}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-full bg-[#0a0a0a] hover:bg-[#1f1f1f] text-white text-[14.5px] font-medium"
              >
                {t("nav.dashboard")}
              </Link>
            </div>
          </nav>
        )}
      </header>
    </div>
  );
}
