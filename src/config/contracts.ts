// Typed Contract ABIs & Address Helpers

import type { Abi } from "viem";
import PaymentRouterAbiJson from "../../contracts/PaymentRouter.abi.json";
import { CURRENT_NETWORK } from "./network";

export const PAYMENT_ROUTER_ABI = PaymentRouterAbiJson as unknown as Abi;

export const ERC20_ABI = [
  {
    type: "function",
    name: "name",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

export function getRouterContractConfig() {
  if (!CURRENT_NETWORK.routerAddress) {
    throw new Error(
      `NETWORK CONFIG ERROR: Cannot enable network '${CURRENT_NETWORK.name}': routerAddress is null or not configured.`
    );
  }
  return {
    address: CURRENT_NETWORK.routerAddress as `0x${string}`,
    abi: PAYMENT_ROUTER_ABI,
  };
}

export function getUsdcContractConfig() {
  return {
    address: CURRENT_NETWORK.usdcAddress,
    abi: ERC20_ABI,
  };
}
