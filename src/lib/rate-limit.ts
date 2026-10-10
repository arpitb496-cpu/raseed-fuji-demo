import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const inMemoryStore = new Map<string, RateLimitRecord>();

/**
 * Validates Upstash configuration.
 * In production, fails fast if UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN are missing.
 */
export function validateRateLimiterConfig(isProduction: boolean = process.env.NODE_ENV === "production"): void {
  if (isProduction) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || url.trim() === "" || !token || token.trim() === "") {
      throw new Error(
        "SECURITY CONFIGURATION ERROR: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be configured in production."
      );
    }
  }
}

// Fail-fast on module initialization in production
if (process.env.NODE_ENV === "production") {
  validateRateLimiterConfig(true);
}

// Cache ratelimiters by window duration
const ratelimiterCache = new Map<number, Ratelimit>();

function getUpstashLimiter(maxRequests: number, windowSeconds: number): Ratelimit {
  const cacheKey = windowSeconds;
  let limiter = ratelimiterCache.get(cacheKey);
  if (!limiter) {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowSeconds} s`),
      analytics: false,
      prefix: "raseed_rl",
    });
    ratelimiterCache.set(cacheKey, limiter);
  }
  return limiter;
}

/**
 * In-memory fallback rate limiter for development and local testing.
 */
function checkInMemoryRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const existing = inMemoryStore.get(key);

  if (!existing || now > existing.resetAt) {
    const record: RateLimitRecord = {
      count: 1,
      resetAt: now + windowMs,
    };
    inMemoryStore.set(key, record);
    return { success: true, remaining: maxRequests - 1, resetAt: record.resetAt };
  }

  if (existing.count >= maxRequests) {
    return { success: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return {
    success: true,
    remaining: maxRequests - existing.count,
    resetAt: existing.resetAt,
  };
}

/**
 * Checks rate limit for a given key.
 * In production: Uses Upstash Redis with sliding window.
 * In development/test: Uses fast in-memory token/window tracking.
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number = 20,
  windowSeconds: number = 60
): Promise<{ success: boolean; remaining: number; resetAt: number }> {
  const isProd = process.env.NODE_ENV === "production";
  const hasUpstash = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

  if (isProd || hasUpstash) {
    if (!hasUpstash && isProd) {
      validateRateLimiterConfig(true);
    }
    try {
      const limiter = getUpstashLimiter(maxRequests, windowSeconds);
      const result = await limiter.limit(key);
      return {
        success: result.success,
        remaining: result.remaining,
        resetAt: result.reset,
      };
    } catch (err) {
      if (isProd) {
        // In production, redis errors must not fail open silently without logging
        console.error("Upstash rate limit error:", err);
        throw err;
      }
      return checkInMemoryRateLimit(key, maxRequests, windowSeconds);
    }
  }

  return checkInMemoryRateLimit(key, maxRequests, windowSeconds);
}
