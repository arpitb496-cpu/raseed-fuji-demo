/**
 * Sentry Error Monitoring and PII Scrubber Module
 * 
 * Rules:
 * - Completely a NO-OP if SENTRY_DSN (server) or NEXT_PUBLIC_SENTRY_DSN (client) is unset.
 * - Scrub all PII: strip request bodies, cookies, Authorization headers, query strings on /pay/*,
 *   and wallet signature fields.
 * - Redact RPC URLs containing secret keys.
 * - sendDefaultPii is strictly false.
 */

export interface SentryBreadcrumb {
  category?: string;
  message?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface SentryRequest {
  url?: string;
  query_string?: string;
  headers?: Record<string, string>;
  cookies?: Record<string, string> | string;
  data?: unknown;
  [key: string]: unknown;
}

export interface SentryEvent {
  event_id?: string;
  message?: string;
  request?: SentryRequest;
  extra?: Record<string, unknown>;
  breadcrumbs?: SentryBreadcrumb[];
  user?: Record<string, unknown>;
  [key: string]: unknown;
}

const RPC_SECRET_REGEX = /(?:alchemy\.com\/v2\/|infura\.io\/v3\/|quicknode\.pro\/)[A-Za-z0-9_-]+/gi;
const GENERIC_KEY_URL_REGEX = /([?&](?:key|api_key|apikey|secret|token)=)[^&]+/gi;

/**
 * Redacts RPC API keys or secret URL parameters from text strings.
 */
export function redactSecretUrls(text: string): string {
  if (!text || typeof text !== "string") return text;
  return text
    .replace(RPC_SECRET_REGEX, "[REDACTED_RPC_ENDPOINT]")
    .replace(GENERIC_KEY_URL_REGEX, "$1[REDACTED]");
}

/**
 * Pure function to scrub sensitive PII, request data, cookies, signatures, and RPC secrets
 * before any Sentry event is sent.
 */
export function scrubSentryEvent(event: SentryEvent): SentryEvent {
  const scrubbed: SentryEvent = { ...event };

  // 1. Remove user object completely (never send user IP, email, or id)
  if (scrubbed.user) {
    delete scrubbed.user;
  }

  // 2. Scrub request payload & headers
  if (scrubbed.request) {
    const req: SentryRequest = { ...scrubbed.request };

    // Strip request body
    delete req.data;

    // Strip cookies
    delete req.cookies;

    // Scrub headers
    if (req.headers) {
      const headers = { ...req.headers };
      delete headers["cookie"];
      delete headers["Cookie"];
      delete headers["authorization"];
      delete headers["Authorization"];
      delete headers["x-api-key"];
      delete headers["X-Api-Key"];
      req.headers = headers;
    }

    // Strip query strings on /pay/*
    if (req.url) {
      req.url = redactSecretUrls(req.url);
      if (req.url.includes("/pay/")) {
        const [cleanUrl] = req.url.split("?");
        req.url = cleanUrl;
      }
    }
    if (req.url && req.url.includes("/pay/")) {
      delete req.query_string;
    } else if (req.query_string) {
      req.query_string = redactSecretUrls(req.query_string);
    }

    scrubbed.request = req;
  }

  // 3. Scrub extra metadata & redact wallet signature fields
  if (scrubbed.extra) {
    const extra: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(scrubbed.extra)) {
      const lower = key.toLowerCase();
      if (
        lower.includes("signature") ||
        lower.includes("sig") ||
        lower.includes("secret") ||
        lower.includes("token") ||
        lower.includes("authorization") ||
        lower.includes("cookie") ||
        lower.includes("password") ||
        lower.includes("privatekey")
      ) {
        continue; // strip signature / secret fields
      }
      if (typeof val === "string") {
        extra[key] = redactSecretUrls(val);
      } else {
        extra[key] = val;
      }
    }
    scrubbed.extra = extra;
  }

  // 4. Scrub breadcrumbs
  if (Array.isArray(scrubbed.breadcrumbs)) {
    scrubbed.breadcrumbs = scrubbed.breadcrumbs.map((crumb) => {
      const c = { ...crumb };
      if (c.message) {
        c.message = redactSecretUrls(c.message);
      }
      if (c.data && typeof c.data === "object") {
        const cleanedData: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(c.data)) {
          const lk = k.toLowerCase();
          if (
            lk.includes("signature") ||
            lk.includes("sig") ||
            lk.includes("secret") ||
            lk.includes("token") ||
            lk.includes("cookie") ||
            lk.includes("auth")
          ) {
            continue;
          }
          if (typeof v === "string") {
            cleanedData[k] = redactSecretUrls(v);
          } else {
            cleanedData[k] = v;
          }
        }
        c.data = cleanedData;
      }
      return c;
    });
  }

  // 5. Scrub top-level message
  if (scrubbed.message) {
    scrubbed.message = redactSecretUrls(scrubbed.message);
  }

  return scrubbed;
}

/**
 * Returns Sentry configuration options.
 * Gated by SENTRY_DSN or NEXT_PUBLIC_SENTRY_DSN; otherwise completely inactive.
 */
export function getSentryConfig(isClient = false) {
  const dsn = isClient
    ? process.env.NEXT_PUBLIC_SENTRY_DSN
    : process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

  const isEnabled = Boolean(dsn && dsn.trim().length > 0);

  return {
    enabled: isEnabled,
    dsn: isEnabled ? dsn : undefined,
    sendDefaultPii: false, // strictly false
    beforeSend(event: SentryEvent) {
      return scrubSentryEvent(event);
    },
  };
}
