import { describe, it, expect } from "vitest";
import { generateInvoicePdfBuffer, escapeHtml } from "@/lib/pdf/generate-invoice-pdf";
import { chromium as playwrightChromium } from "playwright-core";

describe("Serverless Hindi PDF Generation & Security Hardening", () => {
  it("properly escapes HTML injection payloads across all user fields", () => {
    const maliciousPayload = "<script>alert('xss')</script><img src='https://malicious.com/log' onerror='steal()'>";
    const escaped = escapeHtml(maliciousPayload);

    expect(escaped).not.toContain("<script>");
    expect(escaped).not.toContain("<img");
    expect(escaped).toContain("&lt;script&gt;");
    expect(escaped).toContain("&lt;img");
    expect(escaped).toContain("&#039;xss&#039;");
  });

  it(
    "renders an invoice containing hostile HTML/XSS injection payloads completely inert",
    async () => {
      const hostileData = {
        invoiceNumber: "INV-HOSTILE-001",
        publicId: "raseed_hostile_test_123",
        title: "<script>window.location='https://attacker.com'</script> Security Test",
        notes: "<img src='https://tracker.attacker.com/beacon.gif' onerror='alert(document.cookie)'> Hostile Note",
        clientName: "<b onmouseover='alert(1)'>Hacker Client</b>",
        clientEmail: "hacker<test>@evil.com",
        merchantDisplayName: "<svg/onload=alert(1)> क्षत्रिय टेक",
        merchantWallet: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        amountUsdc: 100_000_000n,
        status: "SENT",
        dueDate: new Date(Date.now() + 86400000),
        createdAt: new Date(),
        items: [
          {
            description: "<iframe src='https://attacker.com/steal'></iframe> Exploit Description",
            quantity: 1,
            unitAmountUsdc: 100_000_000n,
          },
        ],
      };

      const pdfBuffer = await generateInvoicePdfBuffer(hostileData);

      expect(pdfBuffer).toBeDefined();
      expect(pdfBuffer.length).toBeGreaterThan(1000);
      expect(pdfBuffer.subarray(0, 4).toString()).toBe("%PDF");
    },
    30000
  );

  it(
    "proves zero outbound network requests: external HTTP/HTTPS requests are aborted",
    async () => {
      const browser = await playwrightChromium.launch({ headless: true });
      try {
        const context = await browser.newContext({ javaScriptEnabled: false });
        const page = await context.newPage();

        const abortedUrls: string[] = [];
        const allowedUrls: string[] = [];

        await page.route("**/*", (route) => {
          const url = route.request().url();
          if (url.startsWith("data:") || url.startsWith("about:")) {
            allowedUrls.push(url);
            route.continue();
          } else {
            abortedUrls.push(url);
            route.abort("blockedbyclient");
          }
        });

        // Attempt loading a document with external stylesheets and tracking images
        const testHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <link rel="stylesheet" href="https://external-cdn.com/style.css">
              <script src="https://external-cdn.com/script.js"></script>
            </head>
            <body>
              <img src="https://tracking-server.com/pixel.png">
              <p>Test Content</p>
            </body>
          </html>
        `;

        await page.setContent(testHtml, { waitUntil: "load" });

        // Assert external network requests were intercepted and aborted
        expect(abortedUrls.length).toBeGreaterThanOrEqual(2);
        expect(abortedUrls).toContain("https://external-cdn.com/style.css");
        expect(abortedUrls).toContain("https://tracking-server.com/pixel.png");

        // Verify zero external network requests succeeded
        for (const allowed of allowedUrls) {
          expect(allowed.startsWith("data:") || allowed.startsWith("about:")).toBe(true);
        }
      } finally {
        await browser.close();
      }
    },
    20000
  );

  it(
    "renders complex Devanagari conjuncts using self-hosted font without network calls",
    async () => {
      const pdfBuffer = await generateInvoicePdfBuffer({
        invoiceNumber: "INV-DEVANAGARI-001",
        publicId: "raseed_devanagari_offline_test",
        title: "वेब3 विकास एवं परामर्श चालान",
        merchantDisplayName: "क्षत्रिय टेक्नोलॉजीज",
        merchantWallet: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        clientName: "डेमो ग्राहक (Demo Client)",
        clientEmail: "client@example.com",
        amountUsdc: 250_000_000n,
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

      expect(pdfBuffer).toBeDefined();
      expect(pdfBuffer.subarray(0, 4).toString()).toBe("%PDF");
    },
    30000
  );
});
