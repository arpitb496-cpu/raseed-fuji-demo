"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRANDING } from "@/config/branding";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { Receipt, ShieldCheck, Menu, X, LayoutDashboard } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (pathname.startsWith("/app") || pathname.startsWith("/pay")) {
    return null;
  }

  return (
    <nav className="w-full bg-white/90 backdrop-blur-md border-b border-[#E6E9F5] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Brand Logo & Name */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-9 h-9 rounded-[14px] bg-[#4338CA] flex items-center justify-center text-white shadow-sm group-hover:bg-[#2E259B] transition-colors">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold text-lg tracking-tight text-[#161A3A]">
                  {BRANDING.name}
                </span>
              </div>
              <span className="text-[10px] text-[#5B6190] -mt-0.5 hidden sm:inline">
                Non-Custodial USDC Invoicing
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-[#4B517D]">
            <Link
              href="/"
              className={`hover:text-[#4338CA] transition-colors ${
                pathname === "/" ? "text-[#4338CA] font-semibold" : ""
              }`}
            >
              {t("nav.home")}
            </Link>
            <Link
              href="/about/how-it-works"
              className={`hover:text-[#4338CA] transition-colors ${
                pathname === "/about/how-it-works" ? "text-[#4338CA] font-semibold" : ""
              }`}
            >
              {t("nav.howItWorks")}
            </Link>
            <Link
              href="/security"
              className={`hover:text-[#4338CA] transition-colors flex items-center gap-1 ${
                pathname === "/security" ? "text-[#4338CA] font-semibold" : ""
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-[#4338CA]" />
              {t("nav.security")}
            </Link>
          </div>

          {/* Actions: Language Toggle + App Launch CTA */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <LanguageToggle />

            <Link
              href="/app"
              className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-[16px] bg-[#4338CA] hover:bg-[#2E259B] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>{t("nav.dashboard")}</span>
            </Link>

            {/* Mobile Hamburger Menu */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 py-3 space-y-2 text-sm font-medium">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              {t("nav.home")}
            </Link>
            <Link
              href="/about/how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              {t("nav.howItWorks")}
            </Link>
            <Link
              href="/security"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              {t("nav.security")}
            </Link>
            <Link
              href="/app"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-teal-700 dark:text-teal-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              {t("nav.dashboard")}
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
