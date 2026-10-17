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

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading, signIn, isSigning } = useAuth();
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="w-full max-w-[480px] mx-auto min-h-screen bg-[#F2F4FB] text-[#161A3A] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#4338CA] animate-spin" />
          <p className="text-xs text-[#5B6190]">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="w-full max-w-[480px] mx-auto min-h-screen bg-[#F2F4FB] text-[#161A3A] px-5 py-16 flex flex-col items-center justify-center text-center">
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
      label: "Home",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 11l8-7 8 7v9H4z" />
        </svg>
      ),
    },
    {
      href: "/app/invoices",
      label: "Invoices",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 3h9l4 4v14H6zM14 3v5h5" />
        </svg>
      ),
    },
    {
      href: "/app/settings",
      label: "Settings",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
        </svg>
      ),
    },
  ];

  return (
    <div className="w-full max-w-[480px] mx-auto min-h-screen bg-[#F2F4FB] text-[#161A3A] relative flex flex-col box-border">
      {/* Scrollable Content Area */}
      <div className="flex-1 pb-28">
        {children}
      </div>

      {/* Floating White Bottom Tab Bar */}
      <nav
        aria-label="Bottom Navigation"
        className="fixed bottom-[18px] left-0 right-0 max-w-[480px] mx-auto px-4 z-40 pointer-events-none"
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
                <span>{tab.label}</span>
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
