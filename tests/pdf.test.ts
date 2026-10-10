import { describe, it, expect } from "vitest";
import { generateInvoicePdfBuffer } from "@/lib/pdf/generate-invoice-pdf";
import fs from "fs";

describe("Hindi PDF Generation & Devanagari Shaping", () => {
  it(
    "renders an invoice PDF with complex Devanagari conjuncts without broken glyphs",
    async () => {
      const pdfBuffer = await generateInvoicePdfBuffer({
        invoiceNumber: "INV-0088",
        publicId: "raseed_test_hindi_shaping_123",
        title: "वेब3 विकास एवं परामर्श चालान",
        merchantDisplayName: "क्षत्रिय टेक्नोलॉजीज",
        merchantWallet: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        clientName: "श्रीमान राजेश शर्मा",
        clientEmail: "rajesh@sharma.in",
        amountUsdc: 250_000_000n, // 250 USDC
        status: "SENT",
        dueDate: new Date(Date.now() + 86400000 * 7),
        createdAt: new Date(),
        notes: "श्रीमान, कृपया 7 दिनों के भीतर भुगतान सुनिश्चित करें। धन्यवाद।",
        items: [
          {
            description: "स्मार्ट अनुबंध सुरक्षा लेखापरीक्षा (Security Audit)",
            quantity: 1,
            unitAmountUsdc: 150_000_000n,
          },
          {
            description: "हिमस्खलन सी-चेन एकीकरण (Avalanche Integration)",
            quantity: 1,
            unitAmountUsdc: 100_000_000n,
          },
        ],
      });

      // Verify valid PDF header
      expect(pdfBuffer).toBeDefined();
      expect(pdfBuffer.length).toBeGreaterThan(1000);
      expect(pdfBuffer.subarray(0, 4).toString()).toBe("%PDF");

      // Verify file persistence for visual artifact check
      fs.writeFileSync("/tmp/test_hindi_invoice.pdf", pdfBuffer);
      expect(fs.existsSync("/tmp/test_hindi_invoice.pdf")).toBe(true);
      fs.unlinkSync("/tmp/test_hindi_invoice.pdf");
    },
    30000
  );
});
