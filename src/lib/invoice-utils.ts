// Utility functions for Invoice generation, IDs, CSV escaping, and status computation

import crypto from "crypto";
import { keccak256, stringToBytes } from "viem";
import { InvoiceStatus } from "@prisma/client";

/**
 * Generates an unguessable URL-safe public identifier (24+ characters).
 */
export function generateUnguessablePublicId(): string {
  // 18 bytes of entropy = 24 base64url characters
  const randomBytes = crypto.randomBytes(18);
  return `raseed_${randomBytes.toString("base64url")}`;
}

/**
 * Deterministically derives the bytes32 on-chain invoice identifier from publicId.
 * PaymentRouter on-chain uses bytes32 invoiceId.
 */
export function deriveOnchainInvoiceId(publicId: string): `0x${string}` {
  return keccak256(stringToBytes(publicId));
}

/**
 * Formats a sequential invoice number per merchant.
 */
export function formatInvoiceNumber(index: number): string {
  const padded = String(index).padStart(4, "0");
  return `INV-${padded}`;
}

/**
 * Evaluates dynamic invoice status based on due date.
 * If SENT or PARTIALLY_PAID and dueDate is in the past, marks as EXPIRED.
 */
export function evaluateInvoiceStatus(
  storedStatus: InvoiceStatus,
  dueDate: Date | string
): InvoiceStatus {
  if (storedStatus === InvoiceStatus.CANCELLED) return InvoiceStatus.CANCELLED;
  if (storedStatus === InvoiceStatus.PAID) return InvoiceStatus.PAID;

  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  const now = new Date();

  if (now > due && (storedStatus === InvoiceStatus.SENT || storedStatus === InvoiceStatus.PARTIALLY_PAID || storedStatus === InvoiceStatus.DRAFT)) {
    return InvoiceStatus.EXPIRED;
  }

  return storedStatus;
}

/**
 * Escapes a cell value for CSV export to protect against CSV formula injection (CSV Injection / CWE-1236).
 * Any value beginning with '=', '+', '-', '@', '\t', or '\r' is prepended with a single quote.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";

  let str = String(value);

  // Vulnerable spreadsheet formula injection triggers
  const formulaTriggers = ["=", "+", "-", "@", "\t", "\r"];
  const isFormula = formulaTriggers.some((trigger) => str.startsWith(trigger));
  if (isFormula) {
    str = `'${str}`;
  }

  // RFC-4180 CSV escaping: quote if formula-prefixed, contains delimiter, quotes, or newlines
  const needsQuotes = isFormula || str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r");
  if (needsQuotes) {
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return str;
}
