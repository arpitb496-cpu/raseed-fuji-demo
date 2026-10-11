/**
 * Resolves the application base URL for links, QR payloads, and PDF generation.
 * In production: fails fast if neither NEXT_PUBLIC_APP_URL nor APP_BASE_URL is set.
 * In development / testing: falls back to http://localhost:3000.
 */
export function getAppBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL;
  if (!url || url.trim() === "") {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "CONFIGURATION ERROR: NEXT_PUBLIC_APP_URL or APP_BASE_URL must be configured in production."
      );
    }
    return "http://localhost:3000";
  }
  return url.trim().replace(/\/+$/, "");
}
