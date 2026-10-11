"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { BRANDING } from "@/config/branding";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/useAuth";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { Receipt, ShieldCheck, Menu, X, LogIn, LogOut, LayoutDashboard } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const isPayPage = pathname?.startsWith("/pay");
  const { isConnected } = useAccount();
  const { t } = useI18n();
  const { isAuthenticated, isSigning, signIn, logout, merchant } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Brand Logo & Name */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-sm group-hover:bg-teal-700 transition-colors">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
                  {BRANDING.name}
                </span>
                <span className="text-xs font-medium text-teal-600 dark:text-teal-400 font-serif">
                  ({BRANDING.devanagariName})
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 -mt-0.5 hidden sm:inline">
                Non-Custodial USDC Invoicing
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <Link href="/" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
              {t("nav.home")}
            </Link>
            <Link href="/about/how-it-works" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
              {t("nav.howItWorks")}
            </Link>
            <Link href="/security" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              {t("nav.security")}
            </Link>
            {isAuthenticated && (
              <Link href="/app" className="text-teal-600 dark:text-teal-400 font-semibold flex items-center gap-1">
                <LayoutDashboard className="w-4 h-4" />
                {t("nav.dashboard")}
              </Link>
            )}
          </div>

          {/* Actions: Language Toggle + SIWE + RainbowKit Wallet */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <LanguageToggle />

            {/* SIWE Auth Button (when wallet is connected; hidden on /pay/* for payers) */}
            {!isPayPage && isConnected && (
              <>
                {isAuthenticated ? (
                  <button
                    onClick={logout}
                    title={t("auth.signOut")}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-slate-500" />
                    <span className="truncate max-w-[100px]">{merchant?.displayName || t("auth.signOut")}</span>
                  </button>
                ) : (
                  <button
                    onClick={signIn}
                    disabled={isSigning}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{isSigning ? t("auth.signing") : t("nav.signInWithEthereum")}</span>
                  </button>
                )}
              </>
            )}

            {/* RainbowKit Connect Button (custom responsive rendering preventing overflow) */}
            <div className="shrink-0 max-w-[140px] sm:max-w-none">
              <ConnectButton
                showBalance={false}
                chainStatus="icon"
                accountStatus={{
                  smallScreen: "avatar",
                  largeScreen: "full",
                }}
              />
            </div>

            {/* Mobile Hamburger Menu */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
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
              className="block px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              {t("nav.home")}
            </Link>
            <Link
              href="/about/how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              {t("nav.howItWorks")}
            </Link>
            <Link
              href="/security"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              {t("nav.security")}
            </Link>
            {isAuthenticated && (
              <Link
                href="/app"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-teal-600 dark:text-teal-400 font-semibold"
              >
                {t("nav.dashboard")}
              </Link>
            )}
            {!isPayPage && isConnected && isAuthenticated && (
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-rose-600 dark:text-rose-400 font-medium"
              >
                {t("auth.signOut")}
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
