"use client";

import React from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { CURRENT_NETWORK } from "@/config/network";
import { useI18n } from "@/lib/i18n";
import { AlertCircle, AlertTriangle, ArrowRight } from "lucide-react";

export function NetworkBanner() {
  const { isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { t } = useI18n();

  const isWrongChain = isConnected && chainId !== CURRENT_NETWORK.chain.id;

  return (
    <div className="flex flex-col w-full text-xs">
      {/* 1. Wrong Network Warning Banner */}
      {isWrongChain && (
        <div className="bg-rose-500 text-white px-4 py-2 flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              {t("common.wrongNetwork")}: Please switch to {CURRENT_NETWORK.name}.
            </span>
          </div>
          <button
            onClick={() => switchChain({ chainId: CURRENT_NETWORK.chain.id })}
            className="underline hover:opacity-80 flex items-center gap-1 font-semibold ml-2 cursor-pointer"
          >
            {t("common.switchNetwork")} <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* 2. Persistent Testnet Mode Banner */}
      {CURRENT_NETWORK.isTestnet && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-400 px-4 py-1.5 flex items-center justify-center gap-2 font-medium tracking-wide">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          <span>{t("brand.testMode")}</span>
          <span className="text-amber-600/70 dark:text-amber-400/70">|</span>
          <span className="font-mono-code text-[11px]">Chain ID {CURRENT_NETWORK.chain.id}</span>
        </div>
      )}

      {/* 3. Router Not Configured Notice (if placeholder) */}
      {!CURRENT_NETWORK.isRouterConfigured && (
        <div className="bg-sky-500/10 border-b border-sky-500/20 text-sky-800 dark:text-sky-300 px-4 py-2 flex items-center justify-center gap-2 text-center">
          <AlertTriangle className="w-4 h-4 shrink-0 text-sky-600 dark:text-sky-400" />
          <span>
            <strong>Dev Notice:</strong> Payment Router contract address is currently placeholder. Deploy to Fuji using instructions in{" "}
            <code className="bg-sky-500/10 px-1 py-0.5 rounded font-mono-code">/docs/DEPLOY_FUJI.md</code>.
          </span>
        </div>
      )}
    </div>
  );
}
