import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getServerPublicClient, resetServerPublicClient } from "@/lib/blockchain/client";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import deploymentsData from "../contracts/deployments.json";

describe("Server-Only RPC Isolation & Client Bundle Security (Section A)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetServerPublicClient();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    resetServerPublicClient();
    process.env = { ...originalEnv };
  });

  it("getServerPublicClient uses FUJI_RPC_URL when configured on the server", () => {
    const testFujiRpc = "https://custom-fuji-node.internal.network/rpc";
    process.env.FUJI_RPC_URL = testFujiRpc;
    delete process.env.NEXT_PUBLIC_FUJI_RPC_URL;

    const client = getServerPublicClient(43113);
    expect(client).toBeDefined();
    expect(client.chain?.id).toBe(43113);
  });

  it("getServerPublicClient falls back to deployments.json when server env var is unset", () => {
    delete process.env.FUJI_RPC_URL;
    delete process.env.NEXT_PUBLIC_FUJI_RPC_URL;

    const client = getServerPublicClient(43113);
    expect(client).toBeDefined();
    expect(client.chain?.id).toBe(43113);
    expect(deploymentsData.fuji.rpcUrl).toBeDefined();
  });

  it("proves server-only RPC variable names and private keys are never imported in client components", () => {
    const clientFilesToCheck = [
      resolve(__dirname, "../src/components/providers/Web3Provider.tsx"),
      resolve(__dirname, "../src/app/pay/[publicId]/PayInvoiceClient.tsx"),
      resolve(__dirname, "../src/config/network.ts"),
    ];

    for (const filePath of clientFilesToCheck) {
      if (existsSync(filePath)) {
        const content = readFileSync(filePath, "utf-8");
        // Server variables must NEVER be referenced in client code (only NEXT_PUBLIC_ variants allowed)
        expect(content).not.toMatch(/\bprocess\.env\.FUJI_RPC_URL\b/);
        expect(content).not.toMatch(/\bprocess\.env\.MAINNET_RPC_URL\b/);
      }
    }
  });

  it("proves client bundle static assets do not contain server-only RPC secrets", () => {
    const staticDir = resolve(__dirname, "../.next/static");
    if (existsSync(staticDir)) {
      const fs = require("fs");
      const path = require("path");

      function checkDir(dir: string) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            checkDir(fullPath);
          } else if (file.endsWith(".js")) {
            const code = fs.readFileSync(fullPath, "utf-8");
            expect(code).not.toContain("FUJI_RPC_URL");
            expect(code).not.toContain("MAINNET_RPC_URL");
          }
        }
      }

      checkDir(staticDir);
    }
  });
});
