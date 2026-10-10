/**
 * Next.js Server Startup Hook
 * Runs once when a new Next.js server instance is initiated.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // 1. Session secret production guard
    const { validateSessionSecret } = await import("@/lib/auth/session");
    validateSessionSecret();

    // 2. Upstash Redis rate limiter production guard
    const { validateRateLimiterConfig } = await import("@/lib/rate-limit");
    validateRateLimiterConfig();
  }
}
