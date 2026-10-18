"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import { useI18n } from "@/lib/i18n";
import { Web3Provider } from "@/components/providers/Web3Provider";
import { WrongNetworkBanner } from "@/components/layout/WrongNetworkBanner";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ShieldAlert, LogIn, Loader2 } from "lucide-react";

import { LanguageToggle } from "@/components/common/LanguageToggle";

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading, signIn, isSigning } = useAuth();
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="w-full max-w-[480px] lg:max-w-[1080px] mx-auto min-h-screen bg-[#F2F4FB] text-[#161A3A] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#4338CA] animate-spin" />
          <p className="text-xs text-[#5B6190]">{t("nav.loadingSession") || "Loading session..."}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="w-full max-w-[480px] lg:max-w-[1080px] mx-auto min-h-screen bg-[#F2F4FB] text-[#161A3A] px-5 py-16 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-[22px] bg-white border border-[#E6E9F5] shadow-[0_2px_8px_rgba(40,50,120,0.08)] flex items-center justify-center text-[#4338CA] mb-6">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#161A3A] mb-2">
          {t("auth.signInTitle")}
        </h1>
        <p className="text-sm text-[#4B517D] mb-6 max-w-xs leading-relaxed">
          {t("auth.signInDesc")}
        </p>

        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          <div className="w-full flex justify-center">
            <ConnectButton showBalance={false} chainStatus="icon" />
          </div>
          <button
            onClick={signIn}
            disabled={isSigning}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] rounded-[18px] bg-[#4338CA] hover:bg-[#2E259B] text-white font-semibold text-sm shadow-[0_4px_14px_rgba(67,56,202,0.25)] transition-all cursor-pointer disabled:opacity-50"
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
    );
  }

  const tabs = [
    {
      href: "/app",
      label: t("nav.dashboard"),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 11l8-7 8 7v9H4z" />
        </svg>
      ),
    },
    {
      href: "/app/invoices",
      label: t("nav.invoices"),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 3h9l4 4v14H6zM14 3v5h5" />
        </svg>
      ),
    },
    {
      href: "/app/settings",
      label: t("nav.settings"),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
    <div className="w-full max-w-[480px] lg:max-w-[1080px] mx-auto min-h-screen bg-[#F2F4FB] text-[#161A3A] relative flex flex-col box-border">
      {/* Desktop Top Bar (>= 1024px) */}
      <header className="hidden lg:flex items-center justify-between h-16 border-b border-[#E6E9F5] px-8">
        <div className="flex items-center gap-8">
          <Link href="/app" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-[13px] bg-[#4338CA] flex items-center justify-center shrink-0 text-white">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12l5 5L20 7" />
              </svg>
            </div>
            <span className="font-bold text-lg text-[#161A3A] tracking-tight">CryptoDao</span>
          </Link>

          {/* Horizontal Nav Links: Dashboard, Invoices, Settings */}
          <nav aria-label="Desktop Navigation" className="flex items-center gap-6 text-sm">
            {desktopNavItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`py-5 transition-colors relative font-medium ${
                    isActive
                      ? "text-[#4338CA] font-semibold"
                      : "text-[#5B6190] hover:text-[#161A3A]"
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#4338CA] rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <LanguageToggle />
          <div className="text-xs font-medium px-3 py-1.5 rounded-full bg-white text-[#4B517D] shadow-[0_2px_8px_rgba(40,50,120,0.08)] whitespace-nowrap">
            Fuji testnet
          </div>
        </div>
      </header>

      {/* Scrollable Content Area with 24px top padding on phones and 32px on laptop */}
      <div className="flex-1 px-5 lg:px-8 pt-6 lg:pt-8 pb-28 lg:pb-12">
        {children}
      </div>

      {/* Floating White Bottom Tab Bar (hidden on desktop) */}
      <nav
        aria-label="Bottom Navigation"
        className="lg:hidden fixed bottom-[18px] left-0 right-0 max-w-[480px] mx-auto px-4 z-40 pointer-events-none"
      >
        <div className="pointer-events-auto h-[64px] rounded-[24px] bg-white shadow-[0_8px_24px_rgba(40,50,120,0.14)] flex items-center justify-around px-2 border border-[#E6E9F5]">
          {tabs.map((tab) => {
            const isActive =
              tab.href === "/app"
                ? pathname === "/app"
                : pathname.startsWith(tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center gap-[3px] min-w-[56px] min-h-[44px] transition-colors ${
                  isActive
                    ? "text-[#4338CA] font-bold"
                    : "text-[#5B6190] font-medium hover:text-[#161A3A]"
                }`}
                style={{ fontSize: 11 }}
              >
                {tab.icon}
                <span className="truncate max-w-[100px] text-center">{tab.label}</span>
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
