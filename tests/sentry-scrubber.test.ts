import { describe, it, expect } from "vitest";
import { scrubSentryEvent, getSentryConfig, redactSecretUrls } from "@/lib/monitoring/sentry";

describe("Sentry PII scrubber & config", () => {
  it("redacts secret RPC URLs and query API keys", () => {
    const raw = "Error querying https://avalanche-fuji.alchemy.com/v2/secret_key_1234567890 for block";
    expect(redactSecretUrls(raw)).not.toContain("secret_key_1234567890");
    expect(redactSecretUrls(raw)).toContain("[REDACTED_RPC_ENDPOINT]");

    const withKey = "https://rpc.example.com?key=supersecretkey999";
    expect(redactSecretUrls(withKey)).not.toContain("supersecretkey999");
    expect(redactSecretUrls(withKey)).toContain("?key=[REDACTED]");
  });

  it("scrubs request body, cookies, authorization headers, and pay query strings", () => {
    const event = {
      event_id: "evt-1",
      user: { id: "user-123", email: "alice@example.com", ip_address: "127.0.0.1" },
      request: {
        url: "https://raseed.app/pay/raseed_INV123?ref=ad_campaign&token=secret123",
        query_string: "ref=ad_campaign&token=secret123",
        headers: {
          authorization: "Bearer secret-jwt-token-123",
          cookie: "session=xyz123; tracking=abc",
          "user-agent": "Mozilla/5.0",
        },
        data: { amount: 100, payer: "0x1234" },
      },
      extra: {
        signature: "0x3918239018239018239018230918203918230918",
        sig: "0x9812",
        status: "failed",
        endpoint: "https://avalanche-fuji.alchemy.com/v2/my_secret_token",
      },
    };

    const scrubbed = scrubSentryEvent(event);

    // 1. User object completely stripped
    expect(scrubbed.user).toBeUndefined();

    // 2. Request body stripped
    expect(scrubbed.request?.data).toBeUndefined();

    // 3. Cookies and Authorization headers stripped
    expect(scrubbed.request?.cookies).toBeUndefined();
    expect(scrubbed.request?.headers?.authorization).toBeUndefined();
    expect(scrubbed.request?.headers?.cookie).toBeUndefined();
    expect(scrubbed.request?.headers?.["user-agent"]).toBe("Mozilla/5.0");

    // 4. Query string stripped on /pay/*
    expect(scrubbed.request?.url).toBe("https://raseed.app/pay/raseed_INV123");
    expect(scrubbed.request?.query_string).toBeUndefined();

    // 5. Signature and secret fields stripped in extra
    expect(scrubbed.extra?.signature).toBeUndefined();
    expect(scrubbed.extra?.sig).toBeUndefined();
    expect(scrubbed.extra?.status).toBe("failed");
    expect(scrubbed.extra?.endpoint).toContain("[REDACTED_RPC_ENDPOINT]");
  });

  it("ensures sendDefaultPii is false and disabled when DSN is empty", () => {
    const originalDsn = process.env.SENTRY_DSN;
    const originalPubDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

    delete process.env.SENTRY_DSN;
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;

    const config = getSentryConfig(false);
    expect(config.enabled).toBe(false);
    expect(config.dsn).toBeUndefined();
    expect(config.sendDefaultPii).toBe(false);

    // Restore env
    if (originalDsn) process.env.SENTRY_DSN = originalDsn;
    if (originalPubDsn) process.env.NEXT_PUBLIC_SENTRY_DSN = originalPubDsn;
  });
});
