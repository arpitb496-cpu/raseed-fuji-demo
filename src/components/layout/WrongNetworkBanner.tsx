"use client";

import React from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { CURRENT_NETWORK } from "@/config/network";
import { useI18n } from "@/lib/i18n";
import { AlertCircle, ArrowRight } from "lucide-react";

export function WrongNetworkBanner() {
  const { isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { t } = useI18n();

  const isWrongChain = isConnected && chainId !== CURRENT_NETWORK.chain.id;
  if (!isWrongChain) return null;

  return (
    <div className="bg-rose-500 text-white px-4 py-2 flex items-center justify-between font-medium text-xs">
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
  );
}
