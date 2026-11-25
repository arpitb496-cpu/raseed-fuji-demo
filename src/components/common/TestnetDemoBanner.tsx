"use client";

import React from "react";
import { usePathname } from "next/navigation";

export function TestnetDemoBanner({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/app") || pathname?.startsWith("/pay")) {
    return null;
  }
  return (
    <aside
      aria-label="Testnet demo notice"
      data-testid="testnet-demo-notice"
      className={`w-full bg-[#0a0a0a] border-b border-[#1a1a1a] text-[#fffaf0] py-2 px-4 text-center text-xs font-normal z-50 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 ${className}`}
    >
      <span className="inline-flex items-center gap-2 font-medium tracking-[0.06em] uppercase text-[#ffb084] text-[11px]">
        <span className="w-2 h-2 rounded-full bg-[#ffb084] animate-pulse" />
        Testnet Demo — No Real Money
      </span>
      <span className="hidden sm:inline text-[#6a6a6a]">•</span>
      <span className="text-[#fffaf0] font-normal">
        टेस्टनेट डेमो — कोई वास्तविक धन नहीं (Avalanche Fuji)
      </span>
      <span className="hidden sm:inline text-[#6a6a6a]">•</span>
      <span className="text-[#d6d1c4] text-[11px]">
        Partnership &amp; Grant Evaluation
      </span>
    </aside>
  );
}
