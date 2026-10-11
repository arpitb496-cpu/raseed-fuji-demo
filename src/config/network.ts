// Network & Token Configuration for Avalanche C-Chain

import { type Chain } from "viem";
import { avalanche, avalancheFuji } from "viem/chains";

export type NetworkKey = "fuji" | "mainnet";

export interface NetworkConfig {
  key: NetworkKey;
  chain: Chain;
  name: string;
  isTestnet: boolean;
  rpcUrl: string;
  explorerUrl: string;
  usdcAddress: `0x${string}`;
  usdcDecimals: number;
  routerAddress: `0x${string}`;
  isRouterConfigured: boolean;
}

// Known placeholder address indicating contract is not yet deployed
export const PLACEHOLDER_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

function isConfiguredAddress(address?: string): address is `0x${string}` {
  if (!address) return false;
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return false;
  return address.toLowerCase() !== PLACEHOLDER_ADDRESS.toLowerCase();
}

// Active network selection from environment
export const ACTIVE_NETWORK_KEY: NetworkKey =
  process.env.NEXT_PUBLIC_NETWORK === "mainnet" ? "mainnet" : "fuji";

// Strict Runtime Guard: Refuse to execute against Mainnet unless deliberate override flag is set
if (
  ACTIVE_NETWORK_KEY === "mainnet" &&
  process.env.ALLOW_MAINNET !== "true" &&
  process.env.NEXT_PUBLIC_ALLOW_MAINNET !== "true"
) {
  throw new Error(
    "MAINNET GUARD: Raseed is configured strictly as a TESTNET-ONLY DEMO on Avalanche Fuji for partnership and grant reviews. Refusing to run against mainnet unless ALLOW_MAINNET=true is explicitly configured."
  );
}

const fujiRouter = process.env.NEXT_PUBLIC_FUJI_ROUTER_ADDRESS;
const mainnetRouter = process.env.NEXT_PUBLIC_MAINNET_ROUTER_ADDRESS;

export const NETWORKS: Record<NetworkKey, NetworkConfig> = {
  fuji: {
    key: "fuji",
    chain: avalancheFuji,
    name: "Avalanche Fuji Testnet",
    isTestnet: true,
    rpcUrl:
      process.env.NEXT_PUBLIC_FUJI_RPC_URL ||
      "https://api.avax-test.network/ext/bc/C/rpc",
    explorerUrl: "https://testnet.snowtrace.io",
    // Official native Circle USDC address on Avalanche Fuji (Source: developers.circle.com)
    usdcAddress: "0x5425890298aed601595a70AB815c96711a31Bc65",
    usdcDecimals: 6,
    routerAddress: isConfiguredAddress(fujiRouter) ? fujiRouter : PLACEHOLDER_ADDRESS,
    isRouterConfigured: isConfiguredAddress(fujiRouter),
  },
  mainnet: {
    key: "mainnet",
    chain: avalanche,
    name: "Avalanche C-Chain",
    isTestnet: false,
    rpcUrl:
      process.env.NEXT_PUBLIC_MAINNET_RPC_URL ||
      "https://api.avax.network/ext/bc/C/rpc",
    explorerUrl: "https://snowtrace.io",
    // Official native Circle USDC address on Avalanche Mainnet (Source: developers.circle.com)
    usdcAddress: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    usdcDecimals: 6,
    routerAddress: isConfiguredAddress(mainnetRouter) ? mainnetRouter : PLACEHOLDER_ADDRESS,
    isRouterConfigured: isConfiguredAddress(mainnetRouter),
  },
};

export const CURRENT_NETWORK: NetworkConfig = NETWORKS[ACTIVE_NETWORK_KEY];
