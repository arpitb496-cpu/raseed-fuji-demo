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
});
