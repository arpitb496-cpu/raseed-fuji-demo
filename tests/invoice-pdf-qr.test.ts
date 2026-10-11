/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import QRCode from "qrcode";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";
import { getAppBaseUrl } from "@/config/url";
import { CURRENT_NETWORK } from "@/config/network";
import {
  generateInvoicePdfBuffer,
  generateReceiptPdfBuffer,
  buildInvoiceHtml,
  buildReceiptHtml,
} from "@/lib/pdf/generate-invoice-pdf";

function decodeQrFromPdf(pdfBuffer: Buffer): string | null {
  if (process.platform !== "darwin") {
    console.warn(
      `[CI Notice] Skipping macOS native 'sips' QR decoding on platform '${process.platform}'. ('sips' is only available on macOS).`
    );
    return null;
  }
  const tmpDir = os.tmpdir();
  const rand = Math.random().toString(36).substring(7);
  const pdfPath = path.join(tmpDir, `test_qr_${Date.now()}_${rand}.pdf`);
  const pngPath = path.join(tmpDir, `test_qr_${Date.now()}_${rand}.png`);
  try {
    fs.writeFileSync(pdfPath, pdfBuffer);
    execSync(`sips -s format png "${pdfPath}" --out "${pngPath}"`, { stdio: "pipe" });
    const pngBuffer = fs.readFileSync(pngPath);
    const png = PNG.sync.read(pngBuffer);
    const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    return decoded ? decoded.data : null;
  } finally {
    if (fs.existsSync(pdfPath)) try { fs.unlinkSync(pdfPath); } catch {}
    if (fs.existsSync(pngPath)) try { fs.unlinkSync(pngPath); } catch {}
  }
}

function extractTextFromPdf(pdfBuffer: Buffer): string | null {
  if (process.platform !== "darwin") {
    console.warn(
      `[CI Notice] Skipping macOS native 'osascript (PDFKit)' text extraction on platform '${process.platform}'. ('osascript' PDFKit is only available on macOS).`
    );
    return null;
  }
  const tmpDir = os.tmpdir();
  const rand = Math.random().toString(36).substring(7);
  const pdfPath = path.join(tmpDir, `test_txt_${Date.now()}_${rand}.pdf`);
  try {
    fs.writeFileSync(pdfPath, pdfBuffer);
    const script = `
      ObjC.import("PDFKit");
      var url = $.NSURL.fileURLWithPath("${pdfPath}");
      var doc = $.PDFDocument.alloc.initWithURL(url);
      var text = "";
      for (var i = 0; i < doc.pageCount; i++) {
        text += doc.pageAtIndex(i).string.js + "\\n";
      }
      text;
    `;
    const out = execSync(`osascript -l JavaScript -e '${script.replace(/'/g, "'\\''")}'`, { encoding: "utf8" });
    return out;
  } finally {
    if (fs.existsSync(pdfPath)) try { fs.unlinkSync(pdfPath); } catch {}
  }
}

describe("Invoice & Receipt PDF Verification (Section J & Phase 5.7 Item C)", () => {
  describe("getAppBaseUrl configuration guard", () => {
    it("fails fast in production mode if NEXT_PUBLIC_APP_URL is unset or empty", () => {
      const origEnv = process.env.NODE_ENV;
      const origUrl = process.env.NEXT_PUBLIC_APP_URL;
      const origBase = process.env.APP_BASE_URL;
      try {
        (process.env as any).NODE_ENV = "production";
        delete process.env.NEXT_PUBLIC_APP_URL;
        delete process.env.APP_BASE_URL;

        expect(() => getAppBaseUrl()).toThrow("CONFIGURATION ERROR");
      } finally {
        (process.env as any).NODE_ENV = origEnv;
        if (origUrl) process.env.NEXT_PUBLIC_APP_URL = origUrl;
        if (origBase) process.env.APP_BASE_URL = origBase;
      }
    });

    it("falls back to http://localhost:3000 in development/test if unset", () => {
      const origEnv = process.env.NODE_ENV;
      const origUrl = process.env.NEXT_PUBLIC_APP_URL;
      const origBase = process.env.APP_BASE_URL;
      try {
        (process.env as any).NODE_ENV = "development";
        delete process.env.NEXT_PUBLIC_APP_URL;
        delete process.env.APP_BASE_URL;

        expect(getAppBaseUrl()).toBe("http://localhost:3000");
      } finally {
        (process.env as any).NODE_ENV = origEnv;
        if (origUrl) process.env.NEXT_PUBLIC_APP_URL = origUrl;
        if (origBase) process.env.APP_BASE_URL = origBase;
      }
    });

    it("uses NEXT_PUBLIC_APP_URL when configured and trims trailing slash", () => {
      const origUrl = process.env.NEXT_PUBLIC_APP_URL;
      try {
        process.env.NEXT_PUBLIC_APP_URL = "https://demo.example.com/";
        expect(getAppBaseUrl()).toBe("https://demo.example.com");
      } finally {
        if (origUrl) process.env.NEXT_PUBLIC_APP_URL = origUrl;
        else delete process.env.NEXT_PUBLIC_APP_URL;
      }
    });
  });

  describe("QR Code Payload vs Link Text Decodability", () => {
    it("proves the QR code data URI decodes to the exact same URL as the link text", async () => {
      const publicId = "raseed_test_unguessable_id_42";
      const baseUrl = "https://app.testnet.network";
      const expectedUrl = `${baseUrl}/pay/${encodeURIComponent(publicId)}`;

      const qrDataUrl = await QRCode.toDataURL(expectedUrl, { width: 200, margin: 1 });
      expect(qrDataUrl.startsWith("data:image/png;base64,")).toBe(true);

      const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, "");
      const pngBuffer = Buffer.from(base64Data, "base64");

      const png = PNG.sync.read(pngBuffer);
      const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);

      expect(decoded).toBeDefined();
      expect(decoded?.data).toBe(expectedUrl);
    });
  });

  describe("End-to-End PDF QR Decoding and Text Extraction", () => {
    const isDarwin = process.platform === "darwin";

    it.skipIf(!isDarwin)(
      "macOS native: decodes QR code from invoice PDF via sips and extracts text via PDFKit osascript",
      async () => {
        const mockInvoice = {
          invoiceNumber: "INV-0001",
          publicId: "raseed_invoice_test_123",
          title: "डेमो चालान (Demo Invoice)",
          merchantDisplayName: "Demo Merchant Ltd",
          merchantWallet: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
          clientName: "Demo Client",
          clientEmail: "client@example.com",
          amountUsdc: 2_000_000n,
          status: "SENT",
          dueDate: new Date(Date.now() + 86400000 * 7),
          createdAt: new Date(),
          items: [
            {
              description: "Smart contract audit & consulting",
              quantity: 1,
              unitAmountUsdc: 2_000_000n,
            },
          ],
        };

        const pdfBuffer = await generateInvoicePdfBuffer(mockInvoice);
        expect(pdfBuffer.length).toBeGreaterThan(1000);

        const baseUrl = getAppBaseUrl();
        const expectedPayUrl = `${baseUrl}/pay/${mockInvoice.publicId}`;

        // Decode QR from actual rendered PDF via macOS sips + jsQR
        const decodedQr = decodeQrFromPdf(pdfBuffer);
        expect(decodedQr).toBe(expectedPayUrl);

        // Extract text from actual generated PDF via macOS PDFKit
        const extractedText = extractTextFromPdf(pdfBuffer);
        expect(extractedText).toContain("डेमो चालान (Demo Invoice)");
        expect(extractedText).toContain("टेस्टनेट डेमो");
        expect(extractedText).toContain("रसीद");
        expect(extractedText).toContain("भुगतान");
        expect(extractedText).toContain("चालान");
        expect(extractedText).not.toContain("official");
        expect(extractedText).not.toContain("आधिकारिक");
      },
      30000
    );

    it("cross-platform: generates valid invoice PDF buffer and validates HTML template copy & pay URL", async () => {
      const mockInvoice = {
        invoiceNumber: "INV-0001",
        publicId: "raseed_invoice_test_123",
        title: "डेमो चालान (Demo Invoice)",
        merchantDisplayName: "Demo Merchant Ltd",
        merchantWallet: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        clientName: "Demo Client",
        clientEmail: "client@example.com",
        amountUsdc: 2_000_000n,
        status: "SENT",
        dueDate: new Date(Date.now() + 86400000 * 7),
        createdAt: new Date(),
        items: [
          {
            description: "Smart contract audit & consulting",
            quantity: 1,
            unitAmountUsdc: 2_000_000n,
          },
        ],
      };

      const pdfBuffer = await generateInvoicePdfBuffer(mockInvoice);
      expect(pdfBuffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
      expect(pdfBuffer.length).toBeGreaterThan(1000);

      const baseUrl = getAppBaseUrl();
      const expectedPayUrl = `${baseUrl}/pay/${mockInvoice.publicId}`;

      const html = await buildInvoiceHtml(mockInvoice);
      expect(html).toContain("डेमो चालान (Demo Invoice)");
      expect(html).toContain("टेस्टनेट डेमो");
      expect(html).toContain("रसीद");
      expect(html).toContain("भुगतान");
      expect(html).toContain("चालान");
      expect(html).not.toContain("official");
      expect(html).not.toContain("आधिकारिक");

      // Cross-platform QR verification: decode base64 data URI directly via pngjs & jsQR
      const qrMatch = html.match(/src="data:image\/png;base64,([^"]+)"/);
      expect(qrMatch).not.toBeNull();
      const qrPngBuffer = Buffer.from(qrMatch![1], "base64");
      const png = PNG.sync.read(qrPngBuffer);
      const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
      expect(decoded?.data).toBe(expectedPayUrl);
    }, 30000);

    it.skipIf(!isDarwin)(
      "macOS native: decodes QR code from receipt PDF via sips and extracts text via PDFKit osascript",
      async () => {
        const txHash = "0x7267ee88fff671f7ca6d78d83a134e5c9bc9b34d1d1147ea0c333919a75deaec";
        const mockReceipt = {
          invoiceNumber: "INV-0002",
          receiptNumber: "RCPT-INV-0002",
          publicId: "raseed_receipt_test_456",
          title: "डेमो भुगतान रसीद परीक्षण",
          merchantDisplayName: "Demo Merchant Ltd",
          merchantWallet: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
          totalInvoiceAmountUsdc: 2_000_000n,
          totalPaidAmountUsdc: 2_000_000n,
          status: "PAID",
          createdAt: new Date(),
          paymentEvents: [
            {
              txHash,
              payerAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
              amountUsdc: 2_000_000n,
              blockNumber: 12345678n,
              confirmedAt: new Date(),
            },
          ],
        };

        const pdfBuffer = await generateReceiptPdfBuffer(mockReceipt);
        expect(pdfBuffer.length).toBeGreaterThan(1000);

        const expectedTxUrl = `${CURRENT_NETWORK.explorerUrl}/tx/${txHash}`;

        // Decode QR from actual rendered PDF via macOS sips + jsQR
        const decodedQr = decodeQrFromPdf(pdfBuffer);
        expect(decodedQr).toBe(expectedTxUrl);

        // Extract text from actual generated PDF via macOS PDFKit
        const extractedText = extractTextFromPdf(pdfBuffer);
        expect(extractedText).toContain("डेमो भुगतान रसीद परीक्षण");
        expect(extractedText).toContain("डेमो भुगतान रसीद");
        expect(extractedText).toContain("भुगतान रसीद");
        expect(extractedText).toContain("चालान");
        expect(extractedText).toContain("लेनदेन");
        expect(extractedText).not.toContain("official");
        expect(extractedText).not.toContain("आधिकारिक");
      },
      30000
    );

    it("cross-platform: generates valid receipt PDF buffer and validates HTML template copy & explorer URL", async () => {
      const txHash = "0x7267ee88fff671f7ca6d78d83a134e5c9bc9b34d1d1147ea0c333919a75deaec";
      const mockReceipt = {
        invoiceNumber: "INV-0002",
        receiptNumber: "RCPT-INV-0002",
        publicId: "raseed_receipt_test_456",
        title: "डेमो भुगतान रसीद परीक्षण",
        merchantDisplayName: "Demo Merchant Ltd",
        merchantWallet: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        totalInvoiceAmountUsdc: 2_000_000n,
        totalPaidAmountUsdc: 2_000_000n,
        status: "PAID",
        createdAt: new Date(),
        paymentEvents: [
          {
            txHash,
            payerAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            amountUsdc: 2_000_000n,
            blockNumber: 12345678n,
            confirmedAt: new Date(),
          },
        ],
      };

      const pdfBuffer = await generateReceiptPdfBuffer(mockReceipt);
      expect(pdfBuffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
      expect(pdfBuffer.length).toBeGreaterThan(1000);

      const expectedTxUrl = `${CURRENT_NETWORK.explorerUrl}/tx/${txHash}`;

      const html = await buildReceiptHtml(mockReceipt);
      expect(html).toContain("डेमो भुगतान रसीद परीक्षण");
      expect(html).toContain("डेमो भुगतान रसीद");
      expect(html).toContain("भुगतान रसीद");
      expect(html).toContain("चालान");
      expect(html).toContain("लेनदेन");
      expect(html).not.toContain("official");
      expect(html).not.toContain("आधिकारिक");

      // Cross-platform QR verification: decode base64 data URI directly via pngjs & jsQR
      const qrMatch = html.match(/src="data:image\/png;base64,([^"]+)"/);
      expect(qrMatch).not.toBeNull();
      const qrPngBuffer = Buffer.from(qrMatch![1], "base64");
      const png = PNG.sync.read(qrPngBuffer);
      const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
      expect(decoded?.data).toBe(expectedTxUrl);
    }, 30000);
  });
});

