import { describe, it, expect } from "vitest";
import { checkRateLimit, validateRateLimiterConfig } from "@/lib/rate-limit";

describe("Rate Limiter (Upstash Production Guard & Dev Fallback)", () => {
  describe("Production Configuration Guard", () => {
    it("fails fast in production if UPSTASH_REDIS_REST_URL is missing", () => {
      const origUrl = process.env.UPSTASH_REDIS_REST_URL;
      const origToken = process.env.UPSTASH_REDIS_REST_TOKEN;
      try {
        delete process.env.UPSTASH_REDIS_REST_URL;
        process.env.UPSTASH_REDIS_REST_TOKEN = "mock_token";
        expect(() => validateRateLimiterConfig(true)).toThrow(
          /UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be configured in production/
        );
      } finally {
        if (origUrl !== undefined) process.env.UPSTASH_REDIS_REST_URL = origUrl;
        else delete process.env.UPSTASH_REDIS_REST_URL;
        if (origToken !== undefined) process.env.UPSTASH_REDIS_REST_TOKEN = origToken;
        else delete process.env.UPSTASH_REDIS_REST_TOKEN;
      }
    });

    it("fails fast in production if UPSTASH_REDIS_REST_TOKEN is missing", () => {
      const origUrl = process.env.UPSTASH_REDIS_REST_URL;
      const origToken = process.env.UPSTASH_REDIS_REST_TOKEN;
      try {
        process.env.UPSTASH_REDIS_REST_URL = "https://mock-redis.upstash.io";
        delete process.env.UPSTASH_REDIS_REST_TOKEN;
        expect(() => validateRateLimiterConfig(true)).toThrow(
          /UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be configured in production/
        );
      } finally {
        if (origUrl !== undefined) process.env.UPSTASH_REDIS_REST_URL = origUrl;
        else delete process.env.UPSTASH_REDIS_REST_URL;
        if (origToken !== undefined) process.env.UPSTASH_REDIS_REST_TOKEN = origToken;
        else delete process.env.UPSTASH_REDIS_REST_TOKEN;
      }
    });

    it("succeeds in production when both UPSTASH variables are present", () => {
      const origUrl = process.env.UPSTASH_REDIS_REST_URL;
      const origToken = process.env.UPSTASH_REDIS_REST_TOKEN;
      try {
        process.env.UPSTASH_REDIS_REST_URL = "https://mock-redis.upstash.io";
        process.env.UPSTASH_REDIS_REST_TOKEN = "valid_upstash_secret_token";
        expect(() => validateRateLimiterConfig(true)).not.toThrow();
      } finally {
        if (origUrl !== undefined) process.env.UPSTASH_REDIS_REST_URL = origUrl;
        else delete process.env.UPSTASH_REDIS_REST_URL;
        if (origToken !== undefined) process.env.UPSTASH_REDIS_REST_TOKEN = origToken;
        else delete process.env.UPSTASH_REDIS_REST_TOKEN;
      }
    });
  });

  describe("In-Memory Sliding Rate Limiting (Dev/Test)", () => {
    const testKey = `test_key_${Date.now()}`;

    it("allows requests below the limit and decrements remaining count", async () => {
      const res1 = await checkRateLimit(`${testKey}_allow`, 3, 60);
      expect(res1.success).toBe(true);
      expect(res1.remaining).toBe(2);

      const res2 = await checkRateLimit(`${testKey}_allow`, 3, 60);
      expect(res2.success).toBe(true);
      expect(res2.remaining).toBe(1);

      const res3 = await checkRateLimit(`${testKey}_allow`, 3, 60);
      expect(res3.success).toBe(true);
      expect(res3.remaining).toBe(0);
    });

    it("rejects requests once limit is exceeded", async () => {
      const key = `${testKey}_reject`;
      // Use up limit
      await checkRateLimit(key, 2, 60);
      await checkRateLimit(key, 2, 60);

      // Third request should be blocked
      const res = await checkRateLimit(key, 2, 60);
      expect(res.success).toBe(false);
      expect(res.remaining).toBe(0);
      expect(res.resetAt).toBeGreaterThan(Date.now());
    });

    it("resets window after expiration", async () => {
      const key = `${testKey}_reset`;
      // Window of 1 second
      const res1 = await checkRateLimit(key, 1, 1);
      expect(res1.success).toBe(true);

      const res2 = await checkRateLimit(key, 1, 1);
      expect(res2.success).toBe(false);

      // Wait 1.1s for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const res3 = await checkRateLimit(key, 1, 1);
      expect(res3.success).toBe(true);
    });
  });
});
