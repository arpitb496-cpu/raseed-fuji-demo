/* eslint-disable @typescript-eslint/no-explicit-any */
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

  describe("Scope Update & Demo Guardrails", () => {
    it("refuses to initialize mainnet configuration unless ALLOW_MAINNET=true is explicitly set", async () => {
      const origNetwork = process.env.NEXT_PUBLIC_NETWORK;
      const origAllow = process.env.ALLOW_MAINNET;
      try {
        process.env.NEXT_PUBLIC_NETWORK = "mainnet";
        delete process.env.ALLOW_MAINNET;
        delete process.env.NEXT_PUBLIC_ALLOW_MAINNET;

        // Dynamic import should throw the MAINNET GUARD error
        await expect(async () => {
          // Force module re-evaluation
          const modPath = "../src/config/network.ts?" + Date.now();
          await import(modPath);
        }).rejects.toThrow(/MAINNET GUARD/);
      } finally {
        process.env.NEXT_PUBLIC_NETWORK = origNetwork;
        if (origAllow) process.env.ALLOW_MAINNET = origAllow;
      }
    });

    it("configures robots and sitemap to noindex and empty list when DEMO_INVITE_MODE=true", async () => {
      const origInvite = process.env.DEMO_INVITE_MODE;
      try {
        process.env.DEMO_INVITE_MODE = "true";
        const robotsMod = (await import("../src/app/robots")).default;
        const sitemapMod = (await import("../src/app/sitemap")).default;

        const robotsConfig = robotsMod();
        expect(robotsConfig.rules).toEqual({
          userAgent: "*",
          disallow: "/",
        });

        const sitemapConfig = sitemapMod();
        expect(sitemapConfig).toEqual([]);
      } finally {
        if (origInvite !== undefined) {
          process.env.DEMO_INVITE_MODE = origInvite;
        } else {
          delete process.env.DEMO_INVITE_MODE;
        }
      }
    });
  });

  describe("Network Config Safety & Router Bytecode Verification (Section B)", () => {
    it("records mainnet.routerAddress as null in deployments.json and NETWORKS config", async () => {
      const deployments = (await import("../contracts/deployments.json")).default;
      expect(deployments.mainnet.routerAddress).toBeNull();
      expect(NETWORKS.mainnet.routerAddress).toBeNull();
      expect(NETWORKS.mainnet.isRouterConfigured).toBe(false);
    });

    it("refuses to enable network with null router address via assertNetworkRouterValid", async () => {
      const { assertNetworkRouterValid } = await import("@/config/network");
      expect(() => assertNetworkRouterValid("mainnet")).toThrow(
        "NETWORK CONFIG ERROR: Cannot enable network 'mainnet': routerAddress is null or not configured."
      );
    });

    it("refuses to enable network when eth_getCode returns empty/no bytecode", async () => {
      const { assertNetworkRouterHasCode } = await import("@/config/network");
      const mockPublicClient = {
        getBytecode: async () => "0x",
      } as any;

      // Mock a network configuration with a fake router address that has no bytecode
      const origRouter = NETWORKS.fuji.routerAddress;
      try {
        (NETWORKS.fuji as any).routerAddress = "0x1111111111111111111111111111111111111111";
        await expect(
          assertNetworkRouterHasCode("fuji", mockPublicClient)
        ).rejects.toThrow(/has no on-chain bytecode \(eth_getCode returned empty\)/);
      } finally {
        (NETWORKS.fuji as any).routerAddress = origRouter;
      }
    });

    it("succeeds assertNetworkRouterHasCode when valid contract bytecode exists", async () => {
      const { assertNetworkRouterHasCode } = await import("@/config/network");
      const mockPublicClient = {
        getBytecode: async () => "0x608060405234801561001057600080fd5b50", // Non-empty bytecode
      } as any;

      const origRouter = NETWORKS.fuji.routerAddress;
      try {
        (NETWORKS.fuji as any).routerAddress = "0xb94A922261bBa2e07648520bf56125a4102eaB95";
        await expect(
          assertNetworkRouterHasCode("fuji", mockPublicClient)
        ).resolves.not.toThrow();
      } finally {
        (NETWORKS.fuji as any).routerAddress = origRouter;
      }
    });
  });
});
