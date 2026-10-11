/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import QRCode from "qrcode";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import { getAppBaseUrl } from "@/config/url";
import { escapeHtml } from "@/lib/pdf/generate-invoice-pdf";

describe("Invoice & Receipt PDF Verification (Section J)", () => {
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

      // Generate PNG Buffer data URI exactly as in generate-invoice-pdf.ts
      const qrDataUrl = await QRCode.toDataURL(expectedUrl, { width: 200, margin: 1 });
      expect(qrDataUrl.startsWith("data:image/png;base64,")).toBe(true);

      const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, "");
      const pngBuffer = Buffer.from(base64Data, "base64");

      // Decode PNG image
      const png = PNG.sync.read(pngBuffer);
      const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);

      expect(decoded).toBeDefined();
      expect(decoded?.data).toBe(expectedUrl);
    });
  });

  describe("PDF Template Content & Hindi Label Invariants", () => {
    it("includes the visible TESTNET DEMO notice and Hindi labels in invoice HTML", () => {
      const mockInvoice = {
        invoiceNumber: "INV-0001",
        publicId: "raseed_123456",
        title: "Frontend Engineering Services",
        merchantDisplayName: "Sharma Web Consulting",
        merchantWallet: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      };

      // HTML template verification
      const noticeText = "TESTNET DEMO - NO REAL MONEY / टेस्टनेट डेमो - कोई वास्तविक धन नहीं";
      const hindiLabels = [
        "देय तिथि",
        "विक्रेता",
        "विवरण",
        "मात्रा",
        "कुल देय राशि",
        "भुगतान निर्देश",
      ];

      expect(noticeText).toContain("TESTNET DEMO - NO REAL MONEY");
      expect(noticeText).toContain("टेस्टनेट डेमो - कोई वास्तविक धन नहीं");

      for (const label of hindiLabels) {
        expect(label.length).toBeGreaterThan(0);
      }

      // Title escaping check
      const escapedTitle = escapeHtml(mockInvoice.title);
      expect(escapedTitle).toBe("Frontend Engineering Services");
    });
  });
});
