import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Web3 Provider Scoping to Protected/Interactive Routes", () => {
  const rootDir = path.resolve(__dirname, "..");

  it("verifies public marketing pages and root layout do not import Web3Provider, wagmi, or RainbowKit", () => {
    const publicFiles = [
      "src/app/layout.tsx",
      "src/app/page.tsx",
      "src/app/about/how-it-works/page.tsx",
      "src/app/security/page.tsx",
      "src/app/legal/privacy/page.tsx",
      "src/app/legal/terms/page.tsx",
      "src/app/legal/risks/page.tsx",
      "src/components/layout/Navbar.tsx",
    ];

    const forbiddenImports = [
      "@/components/providers/Web3Provider",
      "@rainbow-me/rainbowkit",
      "from \"wagmi\"",
      "from 'wagmi'",
    ];

    for (const relPath of publicFiles) {
      const fullPath = path.join(rootDir, relPath);
      expect(fs.existsSync(fullPath), `File must exist: ${relPath}`).toBe(true);
      const content = fs.readFileSync(fullPath, "utf-8");

      for (const pattern of forbiddenImports) {
        expect(
          content.includes(pattern),
          `Public marketing file ${relPath} must NOT import ${pattern}`
        ).toBe(false);
      }
    }
  });

  it("verifies /app and /pay layouts correctly scope and import Web3Provider", () => {
    const scopedLayouts = [
      "src/app/app/layout.tsx",
      "src/app/pay/layout.tsx",
    ];

    for (const relPath of scopedLayouts) {
      const fullPath = path.join(rootDir, relPath);
      expect(fs.existsSync(fullPath), `File must exist: ${relPath}`).toBe(true);
      const content = fs.readFileSync(fullPath, "utf-8");
      expect(
        content.includes("Web3Provider"),
        `Scoped layout ${relPath} must import and use Web3Provider`
      ).toBe(true);
    }
  });

  it("verifies build output for landing page does not include wallet provider chunk when .next exists", (ctx) => {
    const manifestPath = path.join(rootDir, ".next/build-manifest.json");
    if (!fs.existsSync(manifestPath)) {
      console.info(
        "[INFO] Skipping build manifest inspection: .next/build-manifest.json does not exist (no production build present in this CI run; run 'npm run build' first to inspect generated chunks)."
      );
      ctx.skip();
      return;
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    const landingParams = manifest.pagesChunkGroupBootstrapParams?.["/page"];
    if (landingParams && landingParams.otherChunks) {
      for (const chunkRel of landingParams.otherChunks) {
        const chunkPath = path.join(rootDir, ".next", chunkRel);
        if (fs.existsSync(chunkPath)) {
          const chunkContent = fs.readFileSync(chunkPath, "utf-8");
          expect(chunkContent).not.toContain("connectorsForWallets");
          expect(chunkContent).not.toContain("RainbowKitProvider");
          expect(chunkContent).not.toContain("WagmiProvider");
        }
      }
    }
  });
});
