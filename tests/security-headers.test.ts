import { describe, it, expect } from "vitest";
import nextConfig from "../next.config";

describe("Security Headers Configuration (next.config.ts)", () => {
  it("defines standard security headers in nextConfig.headers()", async () => {
    expect(nextConfig.headers).toBeDefined();
    if (!nextConfig.headers) return;

    const headersConfig = await nextConfig.headers();
    expect(Array.isArray(headersConfig)).toBe(true);

    const rootRule = headersConfig.find((r) => r.source === "/:path*");
    expect(rootRule).toBeDefined();
    expect(rootRule?.headers).toBeDefined();

    const headersMap = new Map(
      rootRule?.headers.map((h) => [h.key.toLowerCase(), h.value])
    );

    // 1. X-Content-Type-Options: nosniff
    expect(headersMap.get("x-content-type-options")).toBe("nosniff");

    // 2. X-Frame-Options: DENY
    expect(headersMap.get("x-frame-options")).toBe("DENY");

    // 3. Referrer-Policy: strict-origin-when-cross-origin
    expect(headersMap.get("referrer-policy")).toBe("strict-origin-when-cross-origin");

    // 4. Permissions-Policy: camera=(), microphone=(), geolocation=()
    const permissionsPolicy = headersMap.get("permissions-policy");
    expect(permissionsPolicy).toBeDefined();
    expect(permissionsPolicy).toContain("camera=()");
    expect(permissionsPolicy).toContain("microphone=()");
    expect(permissionsPolicy).toContain("geolocation=()");

    // 5. Content-Security-Policy-Report-Only (or Content-Security-Policy)
    const csp = headersMap.get("content-security-policy-report-only") || headersMap.get("content-security-policy");
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("api.avax-test.network");
    expect(csp).toContain("walletconnect");
  });

  it("includes Strict-Transport-Security when NODE_ENV is production", async () => {
    const origEnv = process.env.NODE_ENV;
    try {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      if (!nextConfig.headers) return;
      const headersConfig = await nextConfig.headers();
      const rootRule = headersConfig.find((r) => r.source === "/:path*");
      const headersMap = new Map(
        rootRule?.headers.map((h) => [h.key.toLowerCase(), h.value])
      );
      const hsts = headersMap.get("strict-transport-security");
      expect(hsts).toBeDefined();
      expect(hsts).toContain("max-age=");
      expect(hsts).toContain("includeSubDomains");
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = origEnv;
    }
  });

  it("omits Strict-Transport-Security in non-production local development", async () => {
    const origEnv = process.env.NODE_ENV;
    try {
      (process.env as Record<string, string | undefined>).NODE_ENV = "development";
      if (!nextConfig.headers) return;
      const headersConfig = await nextConfig.headers();
      const rootRule = headersConfig.find((r) => r.source === "/:path*");
      const headersMap = new Map(
        rootRule?.headers.map((h) => [h.key.toLowerCase(), h.value])
      );
      expect(headersMap.get("strict-transport-security")).toBeUndefined();
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = origEnv;
    }
  });
});
