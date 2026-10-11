"use client";

import React from "react";

export function TestnetDemoBanner({ className = "" }: { className?: string }) {
  return (
    <aside
      aria-label="Testnet demo notice"
      data-testid="testnet-demo-notice"
      className={`w-full bg-amber-500/15 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 py-2 px-4 text-center text-xs font-medium backdrop-blur-md z-50 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 ${className}`}
    >
      <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wide text-amber-950 dark:text-amber-100 text-[11px]">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        Testnet Demo — No Real Money
      </span>
      <span className="hidden sm:inline text-amber-500/50">•</span>
      <span className="text-amber-950 dark:text-amber-100 font-medium">
        टेस्टनेट डेमो — कोई वास्तविक धन नहीं (Avalanche Fuji)
      </span>
      <span className="hidden sm:inline text-amber-500/50">•</span>
      <span className="text-amber-950 dark:text-amber-200 text-[11px] font-medium">
        Partnership &amp; Grant Evaluation
      </span>
    </aside>
  );
}
