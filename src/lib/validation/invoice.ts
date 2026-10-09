import { z } from "zod";
import { MIN_INVOICE_AMOUNT_FLOAT } from "@/config/constants";

export const InvoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required").max(200, "Description too long"),
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(10_000),
  unitPriceUsdc: z.number().positive("Unit price must be positive").max(10_000_000),
});

export const CreateInvoiceSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(120, "Title too long"),
  notes: z.string().max(1000, "Notes too long").optional(),
  clientName: z.string().max(100, "Client name too long").optional(),
  clientEmail: z.string().email("Invalid client email address").optional().or(z.literal("")),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Valid due date is required",
  }),
  items: z.array(InvoiceItemSchema).min(1, "At least one line item is required"),
}).refine(
  (data) => {
    const total = data.items.reduce((sum, item) => sum + item.quantity * item.unitPriceUsdc, 0);
    return total >= MIN_INVOICE_AMOUNT_FLOAT;
  },
  {
    message: `Total invoice amount must be at least ${MIN_INVOICE_AMOUNT_FLOAT.toFixed(2)} USDC.`,
    path: ["items"],
  }
);

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
