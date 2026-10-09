import { describe, it, expect } from "vitest";
import { CreateInvoiceSchema, InvoiceItemSchema } from "@/lib/validation/invoice";
import {
  MIN_INVOICE_AMOUNT_USDC,
  MIN_INVOICE_AMOUNT_FLOAT,
  DUST_THRESHOLD_USDC,
  DUST_THRESHOLD_FLOAT,
} from "@/config/constants";

describe("Invoice Validation & Constants Enforcement", () => {
  it("enforces dust threshold is strictly lower than minimum invoice amount", () => {
    expect(DUST_THRESHOLD_USDC < MIN_INVOICE_AMOUNT_USDC).toBe(true);
    expect(DUST_THRESHOLD_FLOAT < MIN_INVOICE_AMOUNT_FLOAT).toBe(true);

    // Specifically: minimum invoice is 1.00 USDC (1,000,000 micro-units), dust is 0.01 USDC (10,000 micro-units)
    expect(MIN_INVOICE_AMOUNT_FLOAT).toBe(1.0);
    expect(DUST_THRESHOLD_FLOAT).toBe(0.01);
  });

  it("validates line items properly", () => {
    const validItem = {
      description: "Smart contract audit hours",
      quantity: 5,
      unitPriceUsdc: 100,
    };
    expect(InvoiceItemSchema.safeParse(validItem).success).toBe(true);

    // Negative unit price rejected
    expect(
      InvoiceItemSchema.safeParse({
        ...validItem,
        unitPriceUsdc: -10,
      }).success
    ).toBe(false);

    // Zero quantity rejected
    expect(
      InvoiceItemSchema.safeParse({
        ...validItem,
        quantity: 0,
      }).success
    ).toBe(false);
  });

  it("accepts invoices with total >= 1.00 USDC", () => {
    const validInvoice = {
      title: "Consulting Services",
      dueDate: "2026-12-31",
      items: [
        {
          description: "Hour 1",
          quantity: 1,
          unitPriceUsdc: 1.0, // Exactly 1.00 USDC minimum
        },
      ],
    };

    const result = CreateInvoiceSchema.safeParse(validInvoice);
    expect(result.success).toBe(true);
  });

  it("rejects invoices with total < 1.00 USDC (e.g. 0.99 USDC)", () => {
    const subOneUsdcInvoice = {
      title: "Micro task",
      dueDate: "2026-12-31",
      items: [
        {
          description: "Micro job",
          quantity: 1,
          unitPriceUsdc: 0.99, // Below 1.00 USDC
        },
      ],
    };

    const result = CreateInvoiceSchema.safeParse(subOneUsdcInvoice);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errorMsg = result.error.issues?.[0]?.message;
      expect(errorMsg).toContain("Total invoice amount must be at least 1.00 USDC");
    }
  });

  it("rejects invoices with dust amount (0.01 USDC)", () => {
    const dustInvoice = {
      title: "Dust task",
      dueDate: "2026-12-31",
      items: [
        {
          description: "Dust amount",
          quantity: 1,
          unitPriceUsdc: 0.01,
        },
      ],
    };

    const result = CreateInvoiceSchema.safeParse(dustInvoice);
    expect(result.success).toBe(false);
  });
});
