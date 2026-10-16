"use client";

import React, { useState, useSyncExternalStore } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { avalanche, avalancheFuji } from "wagmi/chains";
import { RainbowKitProvider, lightTheme, connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  coreWallet,
  metaMaskWallet,
  rabbyWallet,
  injectedWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@rainbow-me/rainbowkit/styles.css";
import { CURRENT_NETWORK } from "@/config/network";
import { validateWalletConnectConfig } from "@/config/walletconnect";

const projectId = validateWalletConnectConfig();

const connectors = connectorsForWallets(
  [
    {
      groupName: "Popular",
      wallets: [coreWallet, metaMaskWallet, rabbyWallet, injectedWallet, walletConnectWallet],
    },
  ],
  {
    appName: "CryptoDao",
    projectId,
  }
);

// Wagmi + RainbowKit Configuration
export const wagmiConfig = createConfig({
  connectors,
  chains: [CURRENT_NETWORK.isTestnet ? avalancheFuji : avalanche],
  transports: {
    [avalancheFuji.id]: http(process.env.NEXT_PUBLIC_FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc"),
    [avalanche.id]: http(process.env.NEXT_PUBLIC_MAINNET_RPC_URL || "https://api.avax.network/ext/bc/C/rpc"),
  },
  ssr: true,
});

const emptySubscribe = () => () => {};

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={lightTheme({
            accentColor: "#4338CA",
            accentColorForeground: "white",
            borderRadius: "large",
          })}
          modalSize="compact"
        >
          {mounted ? children : <div className="invisible">{children}</div>}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
