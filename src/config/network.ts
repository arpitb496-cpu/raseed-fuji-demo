// Network & Token Configuration for Avalanche C-Chain

import { type Chain, type PublicClient } from "viem";
import { avalanche, avalancheFuji } from "viem/chains";
import deploymentsData from "../../contracts/deployments.json";

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
  routerAddress: `0x${string}` | null;
  isRouterConfigured: boolean;
}

// Known placeholder address indicating contract is not yet deployed
export const PLACEHOLDER_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export function isConfiguredAddress(address?: string | null): address is `0x${string}` {
  if (!address) return false;
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return false;
  return address.toLowerCase() !== PLACEHOLDER_ADDRESS.toLowerCase();
}

// Active network selection from environment
export const ACTIVE_NETWORK_KEY: NetworkKey =
  process.env.NEXT_PUBLIC_NETWORK === "mainnet" ? "mainnet" : "fuji";

const fujiRouter = process.env.NEXT_PUBLIC_FUJI_ROUTER_ADDRESS;
const mainnetRouter = process.env.NEXT_PUBLIC_MAINNET_ROUTER_ADDRESS || deploymentsData.mainnet?.routerAddress;

export const NETWORKS: Record<NetworkKey, NetworkConfig> = {
  fuji: {
    key: "fuji",
    chain: avalancheFuji,
    name: "Avalanche Fuji Testnet",
    isTestnet: true,
    rpcUrl:
      process.env.NEXT_PUBLIC_FUJI_RPC_URL ||
      deploymentsData.fuji?.rpcUrl ||
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
      deploymentsData.mainnet?.rpcUrl ||
      "https://api.avax.network/ext/bc/C/rpc",
    explorerUrl: "https://snowtrace.io",
    // Official native Circle USDC address on Avalanche Mainnet (Source: developers.circle.com)
    usdcAddress: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    usdcDecimals: 6,
    routerAddress: isConfiguredAddress(mainnetRouter) ? mainnetRouter : null,
    isRouterConfigured: isConfiguredAddress(mainnetRouter),
  },
};

/**
 * Asserts that the router address for a given network is strictly configured and non-null.
 * Throws a clear configuration error if the router is null or a placeholder.
 */
export function assertNetworkRouterValid(networkKey: NetworkKey): void {
  const config = NETWORKS[networkKey];
  if (!config.routerAddress || config.routerAddress === PLACEHOLDER_ADDRESS) {
    throw new Error(
      `NETWORK CONFIG ERROR: Cannot enable network '${networkKey}': routerAddress is null or not configured.`
    );
  }
}

/**
 * Asserts that the router address for a given network has actual on-chain bytecode (eth_getCode).
 * Refuses to allow network usage if eth_getCode returns empty/0x.
 */
export async function assertNetworkRouterHasCode(
  networkKey: NetworkKey,
  publicClient: PublicClient
): Promise<void> {
  assertNetworkRouterValid(networkKey);
  const config = NETWORKS[networkKey];
  const bytecode = await publicClient.getBytecode({ address: config.routerAddress as `0x${string}` });
  if (!bytecode || bytecode === "0x") {
    throw new Error(
      `NETWORK CONFIG ERROR: Cannot enable network '${networkKey}': router contract at ${config.routerAddress} has no on-chain bytecode (eth_getCode returned empty).`
    );
  }
}

// Strict Runtime Guard: Refuse to execute against Mainnet unless deliberate override flag is set
if (ACTIVE_NETWORK_KEY === "mainnet") {
  if (
    process.env.ALLOW_MAINNET !== "true" &&
    process.env.NEXT_PUBLIC_ALLOW_MAINNET !== "true"
  ) {
    throw new Error(
      "MAINNET GUARD: CryptoDao is configured strictly as a TESTNET-ONLY DEMO on Avalanche Fuji for partnership and grant reviews. Refusing to run against mainnet unless ALLOW_MAINNET=true is explicitly configured."
    );
  }
  assertNetworkRouterValid("mainnet");
}

export const CURRENT_NETWORK: NetworkConfig = NETWORKS[ACTIVE_NETWORK_KEY];
