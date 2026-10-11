import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  address?: `0x${string}`;
  merchantId?: string;
  nonce?: string;
  issuedAt?: number;
}

export const FORBIDDEN_PLACEHOLDER_SECRETS = [
  "replace_with_a_secure_random_32_byte_base64_string",
  "complex_password_at_least_32_characters_long_for_dev_environment_only!",
] as const;

export function validateSessionSecret(
  secret?: string,
  isProduction: boolean = process.env.NODE_ENV === "production"
): string {
  const resolved = secret !== undefined ? secret : (process.env.SESSION_SECRET || "");
  if (isProduction) {
    if (!resolved || resolved.trim() === "") {
      throw new Error("SECURITY ERROR: SESSION_SECRET is required in production environment.");
    }
    if (resolved.length < 32) {
      throw new Error("SECURITY ERROR: SESSION_SECRET must be at least 32 characters long in production.");
    }
    for (const placeholder of FORBIDDEN_PLACEHOLDER_SECRETS) {
      if (resolved === placeholder) {
        throw new Error(
          `SECURITY ERROR: SESSION_SECRET cannot use the placeholder value '${placeholder}' in production.`
        );
      }
    }
    return resolved;
  }

  // Development/Test fallback
  return resolved && resolved.length >= 32
    ? resolved
    : "complex_password_at_least_32_characters_long_for_dev_environment_only!";
}

export const sessionOptions: SessionOptions = {
  password: validateSessionSecret(process.env.SESSION_SECRET),
  cookieName: "raseed_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  },
};

export async function getServerSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
