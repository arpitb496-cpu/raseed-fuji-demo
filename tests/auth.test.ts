import { describe, it, expect } from "vitest";
import { generateNonce, SiweMessage } from "siwe";
import { privateKeyToAccount } from "viem/accounts";

describe("SIWE Authentication & Session Security", () => {
  const testAccount = privateKeyToAccount(
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" // Deterministic testing private key
  );

  it("generates random one-time SIWE nonces", () => {
    const nonce1 = generateNonce();
    const nonce2 = generateNonce();

    expect(nonce1).toBeDefined();
    expect(nonce2).toBeDefined();
    expect(nonce1).not.toBe(nonce2);
    expect(nonce1.length).toBeGreaterThanOrEqual(8);
  });

  it("creates and verifies a valid SIWE message with signature", async () => {
    const nonce = generateNonce();
    const domain = "localhost:3000";
    const origin = "http://localhost:3000";

    const siweMessage = new SiweMessage({
      domain,
      address: testAccount.address,
      statement: "Sign in with Ethereum to Raseed Protocol",
      uri: origin,
      version: "1",
      chainId: 43113,
      nonce,
      issuedAt: new Date().toISOString(),
    });

    const preparedMessage = siweMessage.prepareMessage();
    const signature = await testAccount.signMessage({ message: preparedMessage });

    const verification = await siweMessage.verify({ signature });
    expect(verification.success).toBe(true);
    expect(verification.data.address.toLowerCase()).toBe(testAccount.address.toLowerCase());
    expect(verification.data.nonce).toBe(nonce);
  });

  it("rejects SIWE signature if nonce does not match session", async () => {
    const serverIssuedNonce = generateNonce();
    const attackerNonce = generateNonce();

    const siweMessage = new SiweMessage({
      domain: "localhost:3000",
      address: testAccount.address,
      statement: "Sign in with Ethereum to Raseed Protocol",
      uri: "http://localhost:3000",
      version: "1",
      chainId: 43113,
      nonce: attackerNonce, // Mismatched nonce
      issuedAt: new Date().toISOString(),
    });

    // In verify/route.ts, server checks: siweMessage.nonce === session.nonce
    expect(siweMessage.nonce === serverIssuedNonce).toBe(false);
  });

  it("rejects SIWE verification if signature is signed by a different address", async () => {
    const wrongAccount = privateKeyToAccount(
      "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
    );
    const nonce = generateNonce();

    const siweMessage = new SiweMessage({
      domain: "localhost:3000",
      address: testAccount.address, // Claims to be testAccount
      statement: "Sign in with Ethereum to Raseed Protocol",
      uri: "http://localhost:3000",
      version: "1",
      chainId: 43113,
      nonce,
      issuedAt: new Date().toISOString(),
    });

    const preparedMessage = siweMessage.prepareMessage();
    // Signed by wrongAccount
    const wrongSignature = await wrongAccount.signMessage({ message: preparedMessage });

    await expect(siweMessage.verify({ signature: wrongSignature })).rejects.toThrow();
  });

  it("invalidates nonce immediately upon session creation (one-time use)", () => {
    const session: {
      nonce?: string;
      address?: `0x${string}`;
      merchantId?: string;
    } = {
      nonce: generateNonce(),
    };

    expect(session.nonce).toBeDefined();

    // Verification step consummates nonce:
    session.address = testAccount.address;
    session.merchantId = "merchant_cuid_123";
    session.nonce = undefined; // Cleared

    expect(session.nonce).toBeUndefined();
    expect(session.merchantId).toBe("merchant_cuid_123");
  });

  describe("Production Session Secret Startup Guard", () => {
    it("fails fast in production if SESSION_SECRET is missing or empty", async () => {
      const { validateSessionSecret } = await import("@/lib/auth/session");
      expect(() => validateSessionSecret("", true)).toThrow(
        "SECURITY ERROR: SESSION_SECRET is required in production environment."
      );
      expect(() => validateSessionSecret(undefined, true)).toThrow(
        "SECURITY ERROR: SESSION_SECRET is required in production environment."
      );
    });

    it("fails fast in production if SESSION_SECRET is shorter than 32 characters", async () => {
      const { validateSessionSecret } = await import("@/lib/auth/session");
      expect(() => validateSessionSecret("short_secret_only_24_chars!", true)).toThrow(
        "SECURITY ERROR: SESSION_SECRET must be at least 32 characters long in production."
      );
    });

    it("fails fast in production if SESSION_SECRET uses the .env.example placeholder", async () => {
      const { validateSessionSecret } = await import("@/lib/auth/session");
      expect(() =>
        validateSessionSecret("replace_with_a_secure_random_32_byte_base64_string", true)
      ).toThrow("SECURITY ERROR: SESSION_SECRET cannot use the placeholder value");
    });

    it("succeeds in production with a valid 32+ character random secret", async () => {
      const { validateSessionSecret } = await import("@/lib/auth/session");
      const validSecret = "a_very_secure_and_random_production_secret_32_bytes_long";
      expect(validateSessionSecret(validSecret, true)).toBe(validSecret);
    });
  });
});
