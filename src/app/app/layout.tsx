"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import { useI18n } from "@/lib/i18n";
import { Web3Provider } from "@/components/providers/Web3Provider";
import { WrongNetworkBanner } from "@/components/layout/WrongNetworkBanner";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ShieldAlert, LogIn, Loader2, Check } from "lucide-react";

import { LanguageToggle } from "@/components/common/LanguageToggle";
import { isProtectedRoute } from "@/lib/auth/routes";

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading, signIn, isSigning } = useAuth();
  const { t } = useI18n();

  // Guard: Never render merchant session loading or SIWE auth gate outside protected /app/* routes
  if (!isProtectedRoute(pathname)) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-[#fffaf0] text-[#0a0a0a] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 text-[#0a0a0a] animate-spin" />
          <p className="text-xs text-[#6a6a6a]">
            {t("nav.loadingSession") || "Loading session..."}
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="w-full min-h-screen bg-[#fffaf0] text-[#0a0a0a] px-5 py-16 flex flex-col items-center justify-center text-center">
        <div className="w-full max-w-md bg-[#faf5e8] border border-[#0a0a0a] rounded-[24px] p-8 flex flex-col items-center shadow-[0_24px_48px_-36px_rgba(10,10,10,0.22)]">
          <div className="w-14 h-14 rounded-[16px] bg-[#ffb084] border border-[#0a0a0a]/15 flex items-center justify-center text-[#0a0a0a] mb-5">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="nyc-kicker mb-2">SIWE Authentication</div>
          <h1 className="text-2xl sm:text-3xl font-display font-medium tracking-[-0.03em] text-[#0a0a0a] mb-2">
            {t("auth.signInTitle")}
          </h1>
          <p className="text-sm text-[#3a3a3a] mb-6 max-w-xs leading-relaxed">
            {t("auth.signInDesc")}
          </p>

          <div className="flex flex-col items-center gap-3 w-full">
            <div className="w-full flex justify-center">
              <ConnectButton showBalance={false} chainStatus="icon" />
            </div>
            <button
              onClick={signIn}
              disabled={isSigning}
              className="clay-btn-primary w-full"
            >
              {isSigning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t("auth.signing")}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>{t("auth.signInButton")}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      href: "/app",
      label: t("nav.dashboard"),
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 11l8-7 8 7v9H4z" />
        </svg>
      ),
    },
    {
      href: "/app/invoices",
      label: t("nav.invoices"),
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 3h9l4 4v14H6zM14 3v5h5" />
        </svg>
      ),
    },
    {
      href: "/app/settings",
      label: t("nav.settings"),
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
        </svg>
      ),
    },
  ];

  const desktopNavItems = [
    { href: "/app", label: t("nav.dashboard"), exact: true },
    { href: "/app/invoices", label: t("nav.invoices"), exact: false },
    { href: "/app/settings", label: t("nav.settings"), exact: false },
  ];

  return (
    <div className="w-full min-h-screen bg-[#fffaf0] text-[#0a0a0a] relative flex flex-col box-border">
      {/* Desktop Floating Pill Header (>= 1024px) */}
      <div className="hidden lg:block sticky top-2.5 z-50 px-3.5 pt-2.5 pointer-events-none">
        <header className="nyc-site-header pointer-events-auto mx-auto max-w-[1280px] h-[62px] flex items-center justify-between gap-4 pl-[18px] pr-[10px]">
          <div className="flex items-center gap-6">
            <Link href="/app" className="flex items-center gap-2.5 shrink-0">
              <div className="w-[38px] h-[38px] rounded-[12px] bg-[#0a0a0a] flex items-center justify-center shrink-0 text-[#fffaf0]">
                <Check className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span className="font-medium text-[17.5px] text-[#0a0a0a] tracking-[-0.035em]">
                CryptoDao
              </span>
            </Link>

            <nav aria-label="Desktop Navigation" className="flex items-center gap-1 text-[15px]">
              {desktopNavItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-[15px] py-[9px] rounded-full transition-colors whitespace-nowrap ${
                      isActive
                        ? "bg-[#ebe6d6] text-[#0a0a0a] font-medium"
                        : "text-[#3a3a3a] font-normal hover:bg-[#f5f0e0] hover:text-[#0a0a0a]"
                    }`}
                  >
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 pl-3 border-l border-[#e5e5e5]">
            <LanguageToggle />
            <div className="text-xs font-medium px-3.5 py-2 rounded-full bg-[#ffb084] text-[#0a0a0a] border border-[#0a0a0a]/10 whitespace-nowrap">
              Fuji testnet
            </div>
          </div>
        </header>
      </div>

      {/* Main Content Container */}
      <div className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 lg:pt-8 pb-28 lg:pb-14">
        {children}
      </div>

      {/* Floating Bottom Tab Bar (hidden on desktop) */}
      <nav
        aria-label="Bottom Navigation"
        className="lg:hidden fixed bottom-[18px] left-0 right-0 max-w-[480px] mx-auto px-4 z-40 pointer-events-none"
      >
        <div className="pointer-events-auto h-[64px] rounded-full bg-[#fffaf0]/95 backdrop-blur-md shadow-[0_12px_32px_rgba(10,10,10,0.16)] flex items-center justify-around px-3 border border-[#0a0a0a]">
          {tabs.map((tab) => {
            const isActive =
              tab.href === "/app"
                ? pathname === "/app"
                : pathname.startsWith(tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center gap-[2px] min-w-[64px] min-h-[44px] px-3 rounded-full transition-colors ${
                  isActive
                    ? "bg-[#ebe6d6] text-[#0a0a0a] font-medium"
                    : "text-[#6a6a6a] font-normal hover:text-[#0a0a0a]"
                }`}
                style={{ fontSize: 11 }}
              >
                {tab.icon}
                <span className="truncate max-w-[96px] text-center">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Web3Provider>
      <WrongNetworkBanner />
      <AppLayoutContent>{children}</AppLayoutContent>
    </Web3Provider>
  );
}
