import { z } from "zod";

export const PaymentReportSchema = z.object({
  publicId: z
    .string()
    .trim()
    .min(10, "Invalid public ID format")
    .max(120, "Public ID too long"),
  txHash: z
    .string()
    .trim()
    .regex(/^0x[a-fA-F0-9]{64}$/, "Invalid transaction hash format")
    .transform((val) => val.toLowerCase() as `0x${string}`),
});

export type PaymentReportInput = z.infer<typeof PaymentReportSchema>;
