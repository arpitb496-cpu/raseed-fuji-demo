import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR =
  "/Users/arpitbhardwaj/.gemini/antigravity-ide/brain/dfbbc49f-d571-47fc-9a6b-46d0aa51e6ee/screenshots";

async function main() {
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. Mock Sign-in
  await page.request.post("http://localhost:3000/api/auth/mock-test-login", {
    data: { address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" },
  });

  // 2. Create sample invoice for realistic UI screenshots
  const createRes = await page.request.post("http://localhost:3000/api/invoices", {
    data: {
      title: "Avalanche C-Chain Smart Contract Audit",
      clientName: "Avalanche Foundation",
      clientEmail: "grants@avax.network",
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      notes: "Payment settles directly in native USDC to merchant wallet on Avalanche C-Chain.",
      items: [
        { description: "PaymentRouter.sol Formal Verification & Fuzzing", quantity: 1, unitPriceUsdc: 1500 },
        { description: "Gas Optimization & ERC-2612 Permit Integration", quantity: 1, unitPriceUsdc: 750 },
      ],
    },
  });
  const invoiceData = await createRes.json();
  const invoiceId = invoiceData.invoice?.id;

  const viewports = [
    { name: "desktop_1440", width: 1440, height: 900 },
    { name: "tablet_768", width: 768, height: 1024 },
    { name: "mobile_390", width: 390, height: 844 },
  ];

  const pagesToCapture = [
    { route: "/app", slug: "dashboard" },
    { route: "/app/invoices", slug: "invoices_list" },
    { route: `/app/invoices/${invoiceId}`, slug: "invoice_detail" },
    { route: "/app/settings", slug: "settings" },
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });

    // English captures
    for (const p of pagesToCapture) {
      await page.goto(`http://localhost:3000${p.route}?lang=en`, { waitUntil: "networkidle" });
      await page.waitForTimeout(600);
      const filename = path.join(ARTIFACT_DIR, `phase4_${p.slug}_en_${vp.name}.png`);
      await page.screenshot({ path: filename, fullPage: false });
      console.log(`Captured ${filename}`);
    }

    // Hindi captures
    for (const p of pagesToCapture) {
      await page.goto(`http://localhost:3000${p.route}?lang=hi`, { waitUntil: "networkidle" });
      await page.waitForTimeout(600);
      const filename = path.join(ARTIFACT_DIR, `phase4_${p.slug}_hi_${vp.name}.png`);
      await page.screenshot({ path: filename, fullPage: false });
      console.log(`Captured ${filename}`);
    }
  }

  await browser.close();
  console.log("All screenshots successfully captured!");
}

main().catch(console.error);
