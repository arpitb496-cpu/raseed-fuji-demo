// Server-side Invoice PDF generator using PDFKit and QRCode

import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { formatUsdc } from "@/lib/currency";
import { INDICATIVE_USD_TO_INR_RATE } from "@/config/constants";

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

export async function generateInvoicePdfBuffer(data: InvoicePdfData): Promise<Buffer> {
  const payUrl = `https://raseed.fi/pay/${data.publicId}`;
  const qrBuffer = await QRCode.toBuffer(payUrl, { width: 140, margin: 1 });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));

    // Header & Brand
    doc.fillColor("#0D9488").fontSize(22).font("Helvetica-Bold").text("RASEED (रसीद)", 40, 40);
    doc.fillColor("#64748B").fontSize(9).font("Helvetica").text("Non-Custodial Stablecoin Invoicing | Avalanche C-Chain", 40, 68);

    // Invoice Meta (Right-aligned)
    doc.fillColor("#0F172A").fontSize(14).font("Helvetica-Bold").text(data.invoiceNumber, 360, 40, { align: "right" });
    doc.fillColor("#64748B").fontSize(9).font("Helvetica").text(`Status: ${data.status}`, 360, 58, { align: "right" });
    doc.text(`Due Date: ${new Date(data.dueDate).toLocaleDateString()}`, 360, 72, { align: "right" });

    doc.moveTo(40, 95).lineTo(555, 95).strokeColor("#E2E8F0").lineWidth(1).stroke();

    // Merchant & Client Details
    doc.fillColor("#0F172A").fontSize(10).font("Helvetica-Bold").text("ISSUED BY / विक्रेता:", 40, 110);
    doc.font("Helvetica").fontSize(9).text(data.merchantDisplayName, 40, 125);
    doc.fillColor("#64748B").fontSize(8).text(`Wallet: ${data.merchantWallet}`, 40, 139);

    if (data.clientName || data.clientEmail) {
      doc.fillColor("#0F172A").fontSize(10).font("Helvetica-Bold").text("BILLED TO / क्रेता:", 320, 110);
      if (data.clientName) doc.font("Helvetica").fontSize(9).text(data.clientName, 320, 125);
      if (data.clientEmail) doc.fillColor("#64748B").fontSize(8).text(data.clientEmail, 320, 139);
    }

    // Line Items Table Header
    const tableTop = 180;
    doc.rect(40, tableTop, 515, 22).fillColor("#F8FAFC").fill();
    doc.fillColor("#475569").fontSize(8).font("Helvetica-Bold");
    doc.text("ITEM DESCRIPTION / विवरण", 50, tableTop + 7);
    doc.text("QTY", 320, tableTop + 7, { width: 40, align: "center" });
    doc.text("UNIT PRICE (USDC)", 370, tableTop + 7, { width: 90, align: "right" });
    doc.text("TOTAL (USDC)", 470, tableTop + 7, { width: 75, align: "right" });

    // Line Items
    let currentY = tableTop + 26;
    doc.font("Helvetica").fontSize(9).fillColor("#1E293B");

    data.items.forEach((item) => {
      const lineTotal = item.unitAmountUsdc * BigInt(item.quantity);
      doc.text(item.description, 50, currentY, { width: 260 });
      doc.text(String(item.quantity), 320, currentY, { width: 40, align: "center" });
      doc.text(formatUsdc(item.unitAmountUsdc), 370, currentY, { width: 90, align: "right" });
      doc.text(formatUsdc(lineTotal), 470, currentY, { width: 75, align: "right" });
      currentY += 20;
    });

    doc.moveTo(40, currentY + 5).lineTo(555, currentY + 5).strokeColor("#E2E8F0").stroke();
    currentY += 15;

    // Totals Block
    const totalUsdcFormatted = formatUsdc(data.amountUsdc);
    const approxInr = (Number(data.amountUsdc) / 1_000_000 * INDICATIVE_USD_TO_INR_RATE).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    });

    doc.fontSize(10).font("Helvetica-Bold").text("TOTAL DUE / कुल देय राशि:", 320, currentY);
    doc.fontSize(12).fillColor("#0D9488").text(`${totalUsdcFormatted} USDC`, 440, currentY, { width: 105, align: "right" });
    currentY += 18;

    doc.fontSize(8).font("Helvetica").fillColor("#64748B").text(`Indicative reference: ~₹${approxInr} INR`, 320, currentY, { width: 225, align: "right" });
    currentY += 30;

    // Payment Instructions & QR Code
    doc.rect(40, currentY, 515, 120).strokeColor("#E2E8F0").lineWidth(1).stroke();
    doc.image(qrBuffer, 50, currentY + 10, { width: 100 });

    doc.fillColor("#0F172A").fontSize(10).font("Helvetica-Bold").text("PAYMENT INSTRUCTIONS / भुगतान निर्देश", 165, currentY + 15);
    doc.fillColor("#475569").fontSize(8).font("Helvetica");
    doc.text("1. Scan the QR code or open the official payment link.", 165, currentY + 33);
    doc.text("2. Connect your Web3 wallet on Avalanche C-Chain.", 165, currentY + 47);
    doc.text("3. Settle directly using native Circle USDC. Zero intermediary lockup.", 165, currentY + 61);
    doc.fillColor("#0D9488").fontSize(8).text(`Pay Link: ${payUrl}`, 165, currentY + 77, { link: payUrl, underline: true });

    // Notes
    if (data.notes) {
      currentY += 135;
      doc.fillColor("#0F172A").fontSize(9).font("Helvetica-Bold").text("NOTES / टिप्पणी:", 40, currentY);
      doc.fillColor("#64748B").fontSize(8).font("Helvetica").text(data.notes, 40, currentY + 14, { width: 515 });
    }

    // Footer
    doc.fillColor("#94A3B8").fontSize(7).text(
      "Generated by Raseed Protocol (raseed.fi) — Non-custodial, direct merchant settlement on Avalanche.",
      40,
      780,
      { align: "center", width: 515 }
    );

    doc.end();
  });
}
