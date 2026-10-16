"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import { useI18n } from "@/lib/i18n";
import { Web3Provider } from "@/components/providers/Web3Provider";
import { WrongNetworkBanner } from "@/components/layout/WrongNetworkBanner";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { LayoutDashboard, FileText, PlusCircle, Settings, ShieldAlert, LogIn, LogOut, Loader2, Home } from "lucide-react";

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading, signIn, logout, isSigning, merchant } = useAuth();
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#4338CA] animate-spin" />
          <p className="text-xs text-[#5B6190]">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex-1 max-w-lg mx-auto px-4 py-20 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-[22px] bg-indigo-50 border border-[#E6E9F5] flex items-center justify-center text-[#4338CA] mb-6 shadow-[0_2px_8px_rgba(40,50,120,0.08)]">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#161A3A] mb-2">
          {t("auth.signInTitle")}
        </h1>
        <p className="text-sm text-[#4B517D] mb-6 max-w-sm leading-relaxed">
          {t("auth.signInDesc")}
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <ConnectButton showBalance={false} chainStatus="icon" />
          <button
            onClick={signIn}
            disabled={isSigning}
            className="inline-flex items-center gap-2 px-6 py-3 min-h-[48px] rounded-[18px] bg-[#4338CA] hover:bg-[#2E259B] text-white font-semibold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
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

  const desktopNavItems = [
    { href: "/app", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/app/invoices", label: t("nav.invoices"), icon: FileText },
    { href: "/app/invoices/new", label: t("invoices.newInvoice"), icon: PlusCircle },
    { href: "/app/settings", label: t("nav.settings"), icon: Settings },
  ];

  const mobileTabs = [
    { href: "/app", label: "Home", icon: Home },
    { href: "/app/invoices", label: t("nav.invoices"), icon: FileText },
    { href: "/app/settings", label: t("nav.settings"), icon: Settings },
  ];

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-28 md:pb-8">
      {/* Mobile Top Header: Wallet controls */}
      <div className="flex md:hidden items-center justify-between gap-2 pb-3 border-b border-[#E6E9F5]">
        <span className="text-xs font-bold text-[#161A3A] tracking-tight">Merchant Portal</span>
        <div className="flex items-center gap-2">
          <ConnectButton showBalance={false} chainStatus="icon" />
          <button
            onClick={logout}
            title={t("auth.signOut")}
            className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-[16px] bg-white border border-[#E6E9F5] text-xs font-medium text-[#4B517D] hover:bg-[#F2F4FB] transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-[#5B6190]" />
            <span className="truncate max-w-[80px]">{merchant?.displayName || t("auth.signOut")}</span>
          </button>
        </div>
      </div>

      {/* Desktop Subnavigation Bar */}
      <div className="hidden md:flex items-center justify-between gap-3 pb-3 border-b border-[#E6E9F5]">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {desktopNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/app"
                ? pathname === "/app"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-[16px] text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-[#4338CA] text-white shadow-[0_2px_8px_rgba(67,56,202,0.2)]"
                    : "text-[#4B517D] hover:text-[#161A3A] hover:bg-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Desktop Wallet & Auth Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <ConnectButton showBalance={false} chainStatus="icon" />
          <button
            onClick={logout}
            title={t("auth.signOut")}
            className="flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-[16px] bg-white border border-[#E6E9F5] text-xs font-medium text-[#4B517D] hover:bg-[#F2F4FB] transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-[#5B6190]" />
            <span className="truncate max-w-[120px]">{merchant?.displayName || t("auth.signOut")}</span>
          </button>
        </div>
      </div>

      <div>{children}</div>

      {/* Mobile Floating Bottom Tab Bar */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-4 left-4 right-4 z-40 md:hidden bg-white/95 backdrop-blur-lg rounded-[24px] border border-[#E6E9F5] shadow-[0_8px_30px_rgba(40,50,120,0.15)] px-3 py-2 flex items-center justify-around"
      >
        {mobileTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            tab.href === "/app"
              ? pathname === "/app"
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-1 rounded-[16px] py-1 text-[11px] font-semibold transition-all ${
                isActive
                  ? "text-[#4338CA] bg-indigo-50/70"
                  : "text-[#5B6190] hover:text-[#161A3A]"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
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
