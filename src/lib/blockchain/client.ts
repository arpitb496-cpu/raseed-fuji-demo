import { createPublicClient, http, type PublicClient } from "viem";
import { avalancheFuji, avalanche } from "viem/chains";
import { CURRENT_NETWORK } from "@/config/network";

import deploymentsData from "../../../contracts/deployments.json";

// Server-side RPC client cache
let serverFujiClient: PublicClient | null = null;
let serverMainnetClient: PublicClient | null = null;

export function resetServerPublicClient(): void {
  serverFujiClient = null;
  serverMainnetClient = null;
}

export function getServerPublicClient(chainId?: number): PublicClient {
  const targetChainId = chainId || CURRENT_NETWORK.chain.id;

  if (targetChainId === avalancheFuji.id) {
    if (!serverFujiClient) {
      const defaultFujiRpc =
        deploymentsData.fuji?.rpcUrl || "https://api.avax-test.network/ext/bc/C/rpc";
      const rpcUrl =
        process.env.FUJI_RPC_URL ||
        process.env.NEXT_PUBLIC_FUJI_RPC_URL ||
        defaultFujiRpc;

      serverFujiClient = createPublicClient({
        chain: avalancheFuji,
        transport: http(rpcUrl, {
          retryCount: 3,
          retryDelay: 1000,
        }),
      });
    }
    return serverFujiClient;
  }

  // Fallback for mainnet
  if (!serverMainnetClient) {
    const defaultMainnetRpc =
      deploymentsData.mainnet?.rpcUrl || "https://api.avax.network/ext/bc/C/rpc";
    const mainnetRpc =
      process.env.MAINNET_RPC_URL ||
      process.env.NEXT_PUBLIC_MAINNET_RPC_URL ||
      defaultMainnetRpc;

    serverMainnetClient = createPublicClient({
      chain: avalanche,
      transport: http(mainnetRpc),
    });
  }

  return serverMainnetClient;
}
