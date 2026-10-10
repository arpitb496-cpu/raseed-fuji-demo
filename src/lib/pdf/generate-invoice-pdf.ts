// Server-side Invoice PDF generator with self-hosted Noto Sans Devanagari, zero-network, no-JS security
import QRCode from "qrcode";
import { formatUsdc } from "@/lib/currency";
import { INDICATIVE_USD_TO_INR_RATE } from "@/config/constants";
import {
  NOTO_SANS_DEVANAGARI_REGULAR_BASE64,
  NOTO_SANS_DEVANAGARI_BOLD_BASE64,
} from "./font-data";

export interface InvoicePdfData {
  invoiceNumber: string;
  publicId: string;
  title: string;
  notes?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  merchantDisplayName: string;
  merchantWallet: string;
  amountUsdc: bigint;
  status: string;
  dueDate: Date | string;
  createdAt: Date | string;
  items: Array<{
    description: string;
    quantity: number;
    unitAmountUsdc: bigint;
  }>;
}

/**
 * Escapes all HTML special characters to prevent HTML/XSS injection in generated PDFs.
 */
export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Launches Chromium browser instance.
 * On Vercel / AWS Lambda / Linux, uses @sparticuz/chromium.
 * On local developer/testing machines (macOS/Windows), uses local Chromium binary.
 */
async function launchChromium() {
  const isServerless = Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    (process.platform === "linux" && !process.env.PLAYWRIGHT_BROWSERS_PATH)
  );

  if (isServerless) {
    const chromium = (await import("@sparticuz/chromium")).default;
    const { chromium: playwrightChromium } = await import("playwright-core");
    return await playwrightChromium.launch({
      args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"],
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  // Local environments (macOS, Windows, Linux with Playwright installed)
  try {
    const { chromium: playwrightChromium } = await import("playwright-core");
    return await playwrightChromium.launch({ headless: true });
  } catch {
    const { chromium } = await import("@playwright/test");
    return await chromium.launch({ headless: true });
  }
}

export async function generateInvoicePdfBuffer(data: InvoicePdfData): Promise<Buffer> {
  const payUrl = `https://raseed.fi/pay/${escapeHtml(data.publicId)}`;
  const qrDataUrl = await QRCode.toDataURL(payUrl, { width: 140, margin: 1 });

  const totalUsdcFormatted = formatUsdc(data.amountUsdc);
  const approxInr = (
    (Number(data.amountUsdc) / 1_000_000) *
    INDICATIVE_USD_TO_INR_RATE
  ).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

  const formattedDueDate = new Date(data.dueDate).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const itemsHtml = data.items
    .map((item) => {
      const lineTotal = item.unitAmountUsdc * BigInt(item.quantity);
      return `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #F1F5F9; color: #1E293B;">${escapeHtml(item.description)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #F1F5F9; text-align: center; color: #475569;">${escapeHtml(item.quantity)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #F1F5F9; text-align: right; color: #475569;">${formatUsdc(item.unitAmountUsdc)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #F1F5F9; text-align: right; font-weight: 600; color: #0F172A;">${formatUsdc(lineTotal)}</td>
      </tr>
    `;
    })
    .join("");

  // Build completely self-contained HTML with embedded self-hosted base64 font
  const html = `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="utf-8">
  <title>Invoice ${escapeHtml(data.invoiceNumber)}</title>
  <style>
    @font-face {
      font-family: 'Noto Sans Devanagari';
      font-style: normal;
      font-weight: 400;
      src: url('data:font/truetype;charset=utf-8;base64,${NOTO_SANS_DEVANAGARI_REGULAR_BASE64}') format('truetype');
    }
    @font-face {
      font-family: 'Noto Sans Devanagari';
      font-style: normal;
      font-weight: 700;
      src: url('data:font/truetype;charset=utf-8;base64,${NOTO_SANS_DEVANAGARI_BOLD_BASE64}') format('truetype');
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0F172A;
      background: #FFFFFF;
      padding: 40px;
      font-size: 12px;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 24px;
      border-bottom: 1px solid #E2E8F0;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 700;
      color: #0D9488;
      letter-spacing: -0.5px;
    }
    .brand-subtitle {
      font-size: 11px;
      color: #64748B;
      margin-top: 4px;
    }
    .meta-box {
      text-align: right;
    }
    .invoice-num {
      font-size: 18px;
      font-weight: 700;
      color: #0F172A;
    }
    .status-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 9999px;
      margin-top: 4px;
      background: #F0FDF4;
      color: #166534;
      border: 1px solid #BBF7D0;
    }
    .parties {
      display: flex;
      justify-content: space-between;
      margin-top: 24px;
      gap: 32px;
    }
    .party-col {
      flex: 1;
    }
    .party-label {
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .party-name {
      font-size: 13px;
      font-weight: 600;
      color: #0F172A;
    }
    .party-sub {
      font-size: 10px;
      color: #64748B;
      word-break: break-all;
      margin-top: 2px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 28px;
    }
    th {
      background: #F8FAFC;
      color: #475569;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 10px 12px;
      text-align: left;
      border-top: 1px solid #E2E8F0;
      border-bottom: 1px solid #E2E8F0;
    }
    .totals-wrap {
      margin-top: 24px;
      display: flex;
      justify-content: flex-end;
    }
    .totals-box {
      width: 280px;
      text-align: right;
    }
    .total-grand {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding-top: 10px;
      border-top: 2px solid #E2E8F0;
      margin-top: 4px;
    }
    .total-grand-label {
      font-size: 13px;
      font-weight: 700;
      color: #0F172A;
    }
    .total-grand-amount {
      font-size: 18px;
      font-weight: 700;
      color: #0D9488;
    }
    .inr-ref {
      font-size: 10px;
      color: #64748B;
      margin-top: 4px;
    }
    .pay-card {
      margin-top: 32px;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 16px;
      background: #FAFAFA;
      display: flex;
      gap: 20px;
      align-items: center;
    }
    .qr-img {
      width: 100px;
      height: 100px;
      border-radius: 8px;
      border: 1px solid #E2E8F0;
      background: white;
      padding: 4px;
    }
    .instructions-title {
      font-size: 12px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 4px;
    }
    .instructions-step {
      font-size: 10px;
      color: #475569;
      line-height: 1.6;
    }
    .pay-link {
      color: #0D9488;
      font-weight: 600;
      text-decoration: underline;
      word-break: break-all;
    }
    .notes-box {
      margin-top: 24px;
      padding: 12px 16px;
      background: #F8FAFC;
      border-radius: 8px;
      border-left: 3px solid #0D9488;
    }
    .notes-title {
      font-size: 10px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .notes-content {
      font-size: 11px;
      color: #334155;
    }
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #E2E8F0;
      text-align: center;
      font-size: 9px;
      color: #94A3B8;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand-title">RASEED (रसीद)</div>
      <div class="brand-subtitle">Non-Custodial Stablecoin Invoicing | Avalanche C-Chain</div>
    </div>
    <div class="meta-box">
      <div class="invoice-num">${escapeHtml(data.invoiceNumber)}</div>
      <div><span class="status-badge">${escapeHtml(data.status)}</span></div>
      <div style="font-size: 11px; color: #64748B; margin-top: 6px;">देय तिथि / Due Date: ${formattedDueDate}</div>
    </div>
  </div>

  <div class="parties">
    <div class="party-col">
      <div class="party-label">ISSUED BY / विक्रेता</div>
      <div class="party-name">${escapeHtml(data.merchantDisplayName)}</div>
      <div class="party-sub">Wallet: ${escapeHtml(data.merchantWallet)}</div>
    </div>
    ${
      data.clientName || data.clientEmail
        ? `
    <div class="party-col" style="text-align: right;">
      <div class="party-label">BILLED TO / क्रेता</div>
      ${data.clientName ? `<div class="party-name">${escapeHtml(data.clientName)}</div>` : ""}
      ${data.clientEmail ? `<div class="party-sub">${escapeHtml(data.clientEmail)}</div>` : ""}
    </div>
    `
        : ""
    }
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 50%;">ITEM DESCRIPTION / विवरण</th>
        <th style="text-align: center; width: 15%;">QTY / मात्रा</th>
        <th style="text-align: right; width: 15%;">UNIT (USDC)</th>
        <th style="text-align: right; width: 20%;">TOTAL (USDC)</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="totals-wrap">
    <div class="totals-box">
      <div class="total-grand">
        <span class="total-grand-label">TOTAL DUE / कुल देय राशि</span>
        <span class="total-grand-amount">${totalUsdcFormatted} USDC</span>
      </div>
      <div class="inr-ref">Indicative INR: ~₹${approxInr}</div>
    </div>
  </div>

  <div class="pay-card">
    <img src="${qrDataUrl}" alt="Payment QR Code" class="qr-img" />
    <div>
      <div class="instructions-title">PAYMENT INSTRUCTIONS / भुगतान निर्देश</div>
      <div class="instructions-step">1. Scan the QR code or open the official payment link.</div>
      <div class="instructions-step">2. Connect your Web3 wallet on Avalanche C-Chain.</div>
      <div class="instructions-step">3. Settle directly using native Circle USDC. Funds transfer directly to merchant.</div>
      <div style="margin-top: 6px; font-size: 10px;">
        Link: <a href="${payUrl}" class="pay-link">${payUrl}</a>
      </div>
    </div>
  </div>

  ${
    data.notes
      ? `
  <div class="notes-box">
    <div class="notes-title">NOTES / टिप्पणी</div>
    <div class="notes-content">${escapeHtml(data.notes)}</div>
  </div>
  `
      : ""
  }

  <div class="footer">
    Generated by Raseed Protocol (raseed.fi) — Non-custodial, direct merchant settlement on Avalanche C-Chain.
  </div>
</body>
</html>`;

  const browser = await launchChromium();
  try {
    // Security hardened context: JavaScript strictly disabled
    const context = await browser.newContext({
      javaScriptEnabled: false,
    });
    const page = await context.newPage();

    // Security hardened routing: block all external network requests strictly
    await page.route("**/*", (route) => {
      const url = route.request().url();
      // Allow only internal data: URLs (such as embedded base64 fonts and images) and about:blank
      if (url.startsWith("data:") || url.startsWith("about:")) {
        route.continue();
      } else {
        route.abort("blockedbyclient");
      }
    });

    await page.setContent(html, { waitUntil: "domcontentloaded" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
