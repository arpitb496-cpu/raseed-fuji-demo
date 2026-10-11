import { test, expect } from "@playwright/test";

/**
 * Phase 7 Automated E2E Suite (Testnet Demo Mode)
 * 
 * Target: Avalanche Fuji Testnet Demo
 * Server: Connected to running dev server at baseURL (http://localhost:3000)
 * 
 * Manual-only flows (NOT automated with real private keys):
 * - Browser extension wallet connection (MetaMask, Core, Rabby)
 * - Interactive SIWE EIP-4361 signature popup
 * - Live Fuji on-chain USDC router approval & transfer transactions
 */

test.describe("Phase 7 Testnet Demo E2E Suite", () => {
  test("(a) landing page loads, displays testnet demo banner, and does NOT load wallet JS chunks", async ({ page }) => {
    const loadedScripts: string[] = [];
    page.on("request", (req) => {
      if (req.resourceType() === "script") {
        loadedScripts.push(req.url());
      }
    });

    const res = await page.goto("/");
    expect(res?.status()).toBe(200);

    // Verify testnet banner is visible with testnet warning
    const banner = page.locator('[data-testid="testnet-demo-notice"]');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(/Testnet Demo/i);
    await expect(banner).toContainText(/Avalanche Fuji/i);

    // Verify wallet stack scripts are not loaded on landing page
    const forbiddenBundles = ["rainbow-me", "walletconnect", "@wagmi/core"];
    for (const url of loadedScripts) {
      for (const pattern of forbiddenBundles) {
        expect(
          url.toLowerCase().includes(pattern),
          `Landing page loaded forbidden Web3 chunk: ${url}`
        ).toBe(false);
      }
    }
  });

  test("(b) legal pages load with HTTP 200 and display headers", async ({ page }) => {
    const legalRoutes = [
      { path: "/legal/terms", title: /Terms of Service|नियम एवं शर्तें/i },
      { path: "/legal/privacy", title: /Privacy Policy|गोपनीयता नीति/i },
      { path: "/legal/risks", title: /Risk Disclosures|जोखिम प्रकटीकरण/i },
    ];

    for (const route of legalRoutes) {
      const res = await page.goto(route.path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("h1")).toContainText(route.title);
    }
  });

  test("(c) /pay/<invalid id> renders uniform 'not found' response for invalid IDs", async ({ page }) => {
    await page.goto("/pay/raseed_non_existent_id_99999");
    
    // Expect uniform 'not found' container
    await expect(page.locator("h1")).toContainText(/Invoice Not Found/i);
    await expect(page.locator("text=404").first()).toBeVisible();
  });

  test("(d) /app without an active session shows the sign-in prompt", async ({ page, context }) => {
    // Clear cookies to ensure unauthenticated state
    await context.clearCookies();

    await page.goto("/app");
    
    // Check that authentication prompt is presented
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("h1")).toContainText(/Merchant Authentication|Sign In|लॉग इन/i);
    await expect(page.locator('button:has-text("Connect Wallet"), button:has-text("Sign In")').first()).toBeVisible();
  });

  test("(e) mock-test-login returns 404 under active guarded environment", async ({ page }) => {
    // Under the running server where ENABLE_TEST_LOGIN is not true, the explicit guard blocks access with 404
    const res = await page.request.post("/api/auth/mock-test-login", {
      data: {
        address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      },
    });
    expect(res.status()).toBe(404);
  });
});
