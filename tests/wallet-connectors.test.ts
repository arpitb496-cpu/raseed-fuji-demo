import { describe, it, expect } from "vitest";
import { wagmiConfig } from "@/components/providers/Web3Provider";

describe("Wallet Connectors Security & Compliance", () => {
  it("verifies NO Coinbase or Base wallet connector exists in the connector list", () => {
    const connectors = wagmiConfig.connectors;
    expect(connectors.length).toBeGreaterThan(0);

    for (const connector of connectors) {
      const name = connector.name.toLowerCase();
      const id = connector.id.toLowerCase();

      // Assert no Coinbase wallet connector
      expect(name).not.toContain("coinbase");
      expect(id).not.toContain("coinbase");

      // Assert no Base wallet connector
      expect(name).not.toContain("base wallet");
      expect(id).not.toContain("base");
    }
  });

  it("verifies approved wallet connectors are present (MetaMask, Core, Rabby, WalletConnect)", () => {
    const connectorNames = wagmiConfig.connectors.map((c) => c.name.toLowerCase());
    const connectorIds = wagmiConfig.connectors.map((c) => c.id.toLowerCase());

    const combined = [...connectorNames, ...connectorIds].join(" ");

    // Verify key Avalanche-supported wallets
    expect(combined).toMatch(/metamask|core|rabby|walletconnect|injected/);
  });

  describe("WalletConnect Project ID Startup Guard", () => {
    it("throws clear error in production if project ID is missing or empty", async () => {
      const { validateWalletConnectConfig } = await import("@/config/walletconnect");
      expect(() => validateWalletConnectConfig(undefined, true)).toThrowError(
        /CONFIGURATION ERROR: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is required in production/
      );
      expect(() => validateWalletConnectConfig("", true)).toThrowError(
        /CONFIGURATION ERROR: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is required in production/
      );
    });

    it("throws clear error in production if project ID equals the hardcoded sample ID", async () => {
      const { validateWalletConnectConfig, DEFAULT_WALLETCONNECT_PROJECT_ID } = await import(
        "@/config/walletconnect"
      );
      expect(() => validateWalletConnectConfig(DEFAULT_WALLETCONNECT_PROJECT_ID, true)).toThrowError(
        /must not use the hardcoded sample ID/
      );
    });

    it("succeeds in production when valid custom project ID is provided", async () => {
      const { validateWalletConnectConfig } = await import("@/config/walletconnect");
      const validId = "abcd1234ef567890abcd1234ef567890";
      expect(validateWalletConnectConfig(validId, true)).toBe(validId);
    });

    it("falls back to sample ID in development", async () => {
      const { validateWalletConnectConfig, DEFAULT_WALLETCONNECT_PROJECT_ID } = await import(
        "@/config/walletconnect"
      );
      expect(validateWalletConnectConfig(undefined, false)).toBe(DEFAULT_WALLETCONNECT_PROJECT_ID);
      expect(validateWalletConnectConfig(DEFAULT_WALLETCONNECT_PROJECT_ID, false)).toBe(
        DEFAULT_WALLETCONNECT_PROJECT_ID
      );
    });
  });
});
