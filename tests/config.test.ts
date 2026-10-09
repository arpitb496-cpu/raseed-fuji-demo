import { describe, it, expect } from "vitest";
import { NETWORKS, PLACEHOLDER_ADDRESS } from "@/config/network";
import { PAYMENT_ROUTER_ABI, ERC20_ABI, getRouterContractConfig, getUsdcContractConfig } from "@/config/contracts";

describe("Network & Contract Configuration Tests", () => {
  it("defines canonical Circle native USDC addresses on Fuji and Mainnet", () => {
    // Official Fuji Circle USDC
    expect(NETWORKS.fuji.usdcAddress.toLowerCase()).toBe("0x5425890298aed601595a70ab815c96711a31bc65");
    expect(NETWORKS.fuji.usdcDecimals).toBe(6);

    // Official Mainnet Circle USDC
    expect(NETWORKS.mainnet.usdcAddress.toLowerCase()).toBe("0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e");
    expect(NETWORKS.mainnet.usdcDecimals).toBe(6);
  });

  it("handles unconfigured router gracefully using placeholder address without crashing", () => {
    expect(NETWORKS.fuji.routerAddress).toBe(PLACEHOLDER_ADDRESS);
    expect(NETWORKS.fuji.isRouterConfigured).toBe(false);

    const routerConfig = getRouterContractConfig();
    expect(routerConfig.address).toBe(PLACEHOLDER_ADDRESS);
    expect(routerConfig.abi).toBeDefined();

    const usdcConfig = getUsdcContractConfig();
    expect(usdcConfig.address).toBeDefined();
    expect(usdcConfig.abi).toBeDefined();
  });

  it("loads PaymentRouter ABI containing necessary methods", () => {
    const abi = PAYMENT_ROUTER_ABI as unknown as Array<{ name?: string; type: string }>;
    const functionNames = abi
      .filter((item) => item.type === "function")
      .map((item) => item.name);

    expect(functionNames).toContain("pay");
    expect(functionNames).toContain("payWithPermit");
    expect(functionNames).toContain("feeBps");
    expect(functionNames).toContain("setFee");
    expect(functionNames).toContain("setTreasury");
    expect(functionNames).toContain("treasury");
    expect(functionNames).toContain("usdc");

    const eventNames = abi
      .filter((item) => item.type === "event")
      .map((item) => item.name);

    expect(eventNames).toContain("Paid");
    expect(eventNames).toContain("FeeUpdated");
    expect(eventNames).toContain("TreasuryUpdated");
  });

  it("loads standard ERC20 ABI with allowance, approve, balanceOf, decimals", () => {
    const erc20Functions = ERC20_ABI.map((item) => item.name);
    expect(erc20Functions).toContain("allowance");
    expect(erc20Functions).toContain("approve");
    expect(erc20Functions).toContain("balanceOf");
    expect(erc20Functions).toContain("decimals");
  });
});
