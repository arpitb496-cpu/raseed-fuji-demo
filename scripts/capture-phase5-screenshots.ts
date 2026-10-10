import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const ARTIFACT_DIR =
  "/Users/arpitbhardwaj/.gemini/antigravity-ide/brain/dfbbc49f-d571-47fc-9a6b-46d0aa51e6ee/screenshots";

async function main() {
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  const prisma = new PrismaClient();
  await prisma.$connect();

  const merchantAddress = "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc";
  let merchant = await prisma.merchant.findUnique({
    where: { walletAddress: merchantAddress },
  });

  if (!merchant) {
    merchant = await prisma.merchant.create({
      data: {
        walletAddress: merchantAddress,
        displayName: "Aarav Sharma Tech",
        businessName: "Aarav Consulting Pvt Ltd",
      },
    });
  }

  // Create an invoice with payments timeline flags (Overpayment, Dust, Late) for merchant UI
  const invoice = await prisma.invoice.create({
    data: {
      publicId: `raseed_demo_${Date.now()}`,
      merchantId: merchant.id,
      invoiceNumber: `INV-DEMO-${Date.now().toString().slice(-4)}`,
      title: "Smart Contract Audit & Avalanche Integration",
      dueDate: new Date(Date.now() - 86400000), // Yesterday (Late payment trigger)
      amountUsdc: 15_000_000n, // 15 USDC
      paidAmountUsdc: 16_005_000n, // 16.005 USDC (Overpaid + Dust)
      status: "PAID",
      onchainInvoiceId: `0x${Date.now().toString(16).padStart(64, "0")}`,
      items: {
        create: [
          { description: "PaymentRouter.sol Formal Verification", quantity: 1, unitAmountUsdc: 10_000_000n },
          { description: "Fuji Testnet Integration & Hardening", quantity: 1, unitAmountUsdc: 5_000_000n },
        ],
      },
    },
  });

  // Create payment events: Dust payment
  const dustTx = `0x${crypto.randomBytes(32).toString("hex")}`;
  await prisma.paymentEvent.create({
    data: {
      invoiceId: invoice.id,
      txHash: dustTx,
      logIndex: 0,
      blockHash: `0x${crypto.randomBytes(32).toString("hex")}`,
      blockNumber: 100n,
      chainId: 43113,
      routerAddress: "0xb94a922261bba2e07648520bf56125a4102eab95",
      merchantAddress,
      payerAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
      onchainInvoiceId: invoice.onchainInvoiceId,
      amountUsdc: 5_000n, // 0.005 USDC (Dust)
      feeUsdc: 0n,
    },
  });

  // Create payment events: Partial & Overpayment (Late)
  const overpayTx = `0x${crypto.randomBytes(32).toString("hex")}`;
  await prisma.paymentEvent.create({
    data: {
      invoiceId: invoice.id,
      txHash: overpayTx,
      logIndex: 0,
      blockHash: `0x${crypto.randomBytes(32).toString("hex")}`,
      blockNumber: 150n,
      chainId: 43113,
      routerAddress: "0xb94a922261bba2e07648520bf56125a4102eab95",
      merchantAddress,
      payerAddress: "0x3c44cdddb6a900fa2b585dd299e03d12FA4293bc",
      onchainInvoiceId: invoice.onchainInvoiceId,
      amountUsdc: 16_000_000n, // 16 USDC (Overpayment, Late)
      feeUsdc: 0n,
    },
  });

  // Create AuditLog entries
  await prisma.auditLog.createMany({
    data: [
      {
        merchantId: merchant.id,
        invoiceId: invoice.id,
        action: "OVERPAYMENT_RECEIVED",
        details: JSON.stringify({ target: "15000000", paid: "16005000" }),
      },
      {
        merchantId: merchant.id,
        invoiceId: invoice.id,
        action: "LATE_PAYMENT_RECEIVED",
        details: JSON.stringify({ dueDate: invoice.dueDate.toISOString() }),
      },
    ],
  });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Mock sign-in to access merchant invoice page
  await page.request.post("http://localhost:3000/api/auth/mock-test-login", {
    data: { address: merchantAddress },
  });

  const viewports = [
    { name: "desktop_1440", width: 1440, height: 900 },
    { name: "mobile_390", width: 390, height: 844 },
  ];

  const payStates = [
    { state: "unpaid", slug: "unpaid" },
    { state: "wrong_chain", slug: "wrong_chain" },
    { state: "insufficient_usdc", slug: "insufficient_usdc" },
    { state: "paying", slug: "paying" },
    { state: "paid", slug: "paid" },
    { state: "cancelled", slug: "cancelled_expired" },
  ];

  let ipCounter = 20;
  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });

    // 1. Pay Page States (English & Hindi)
    for (const ps of payStates) {
      for (const lang of ["en", "hi"]) {
        ipCounter++;
        await page.setExtraHTTPHeaders({ "x-forwarded-for": `10.0.2.${ipCounter}` });
        const url = `http://localhost:3000/pay/${invoice.publicId}?mockState=${ps.state}&lang=${lang}`;
        await page.goto(url, { waitUntil: "networkidle" });
        await page.waitForTimeout(400);
        const filename = path.join(ARTIFACT_DIR, `phase5_pay_${ps.slug}_${lang}_${vp.name}.png`);
        await page.screenshot({ path: filename, fullPage: false });
        console.log(`Saved: ${filename}`);
      }
    }

    // 2. Pay Page: Invalid ID 404 (English & Hindi)
    for (const lang of ["en", "hi"]) {
      ipCounter++;
      await page.setExtraHTTPHeaders({ "x-forwarded-for": `10.0.2.${ipCounter}` });
      const url = `http://localhost:3000/pay/raseed_invalid_id_not_found?lang=${lang}`;
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(400);
      const filename = path.join(ARTIFACT_DIR, `phase5_pay_invalid_id_${lang}_${vp.name}.png`);
      await page.screenshot({ path: filename, fullPage: false });
      console.log(`Saved: ${filename}`);
    }

    // 3. Merchant Invoice Detail with Payments Table & Flags (English & Hindi)
    for (const lang of ["en", "hi"]) {
      ipCounter++;
      await page.setExtraHTTPHeaders({ "x-forwarded-for": `10.0.2.${ipCounter}` });
      const url = `http://localhost:3000/app/invoices/${invoice.id}?lang=${lang}`;
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(400);
      const filename = path.join(ARTIFACT_DIR, `phase5_merchant_payments_table_${lang}_${vp.name}.png`);
      await page.screenshot({ path: filename, fullPage: false });
      console.log(`Saved: ${filename}`);
    }
  }

  await browser.close();
  await prisma.$disconnect();
  console.log("All Phase 5 screenshots captured successfully!");
}

main().catch(console.error);
