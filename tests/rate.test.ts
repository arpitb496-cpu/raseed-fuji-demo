import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  parseFrankfurterRate,
  formatInrReferenceLabel,
} from "@/lib/rate";
import { GET, _resetRateCacheForTest } from "@/app/api/rate/route";

describe("USD/INR Rate Parsing, Validation & Formatting", () => {
  describe("parseFrankfurterRate", () => {
    it("accepts valid rates within [20, 500]", () => {
      expect(parseFrankfurterRate({ rate: 83.1 })).toBe(83.1);
      expect(parseFrankfurterRate({ rate: 20 })).toBe(20);
      expect(parseFrankfurterRate({ rate: 500 })).toBe(500);
      expect(parseFrankfurterRate({ base: "USD", quote: "INR", rate: 92.79 })).toBe(92.79);
    });

    it("rejects NaN, 0, negative, strings, 1e9, out-of-range, and missing field", () => {
      expect(parseFrankfurterRate({ rate: Number.NaN })).toBeNull();
      expect(parseFrankfurterRate({ rate: Number.POSITIVE_INFINITY })).toBeNull();
      expect(parseFrankfurterRate({ rate: 0 })).toBeNull();
      expect(parseFrankfurterRate({ rate: -83.1 })).toBeNull();
      expect(parseFrankfurterRate({ rate: "83.1" })).toBeNull();
      expect(parseFrankfurterRate({ rate: 1e9 })).toBeNull();
      expect(parseFrankfurterRate({ rate: 19.99 })).toBeNull();
      expect(parseFrankfurterRate({ rate: 500.01 })).toBeNull();
      expect(parseFrankfurterRate({})).toBeNull();
      expect(parseFrankfurterRate(null)).toBeNull();
      expect(parseFrankfurterRate(undefined)).toBeNull();
    });
  });

  describe("formatInrReferenceLabel", () => {
    const asOf = "2026-11-25T05:30:00.000Z";

    it("formats English reference label accurately without forbidden demo/live claims", () => {
      const label = formatInrReferenceLabel(83.1, asOf, "en");
      expect(label).toBe(
        "Indicative reference: 1 USDC ≈ ₹83.10 INR. Reference rate as of 2026-11-25 05:30 UTC. Assumes 1 USDC = 1 USD. Payments are made in USDC only."
      );
      expect(label.toLowerCase()).not.toContain("illustrative demo rate");
      expect(label.toLowerCase()).not.toContain("live market rate");
    });

    it("formats Hindi reference label accurately", () => {
      const label = formatInrReferenceLabel(83.1, asOf, "hi");
      expect(label).toContain("₹83.10 INR");
      expect(label).toContain("2026-11-25 05:30 UTC");
      expect(label).toContain("1 USDC = 1 USD");
    });
  });

  describe("GET /api/rate", () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      _resetRateCacheForTest();
      vi.restoreAllMocks();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("returns 200 with cached USD/INR payload when Frankfurter responds with valid rate", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ date: "2026-11-25", base: "USD", quote: "INR", rate: 83.1 }),
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const req = new NextRequest("http://localhost:3000/api/rate");
      const res1 = await GET(req);
      expect(res1.status).toBe(200);
      const body1 = await res1.json();
      expect(body1.base).toBe("USD");
      expect(body1.quote).toBe("INR");
      expect(body1.rate).toBe(83.1);
      expect(body1.source).toBe("Frankfurter");
      expect(typeof body1.asOf).toBe("string");

      // Second call within 600s uses in-memory cache
      const res2 = await GET(req);
      expect(res2.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("returns 503 { error: 'rate_unavailable' } when upstream fails or returns invalid rate", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ rate: 1e9 }),
      }) as unknown as typeof fetch;

      const req = new NextRequest("http://localhost:3000/api/rate");
      const res = await GET(req);
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ error: "rate_unavailable" });
    });

    it("returns 503 { error: 'rate_unavailable' } when fetch throws", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("timeout")) as unknown as typeof fetch;

      const req = new NextRequest("http://localhost:3000/api/rate");
      const res = await GET(req);
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ error: "rate_unavailable" });
    });
  });
});
