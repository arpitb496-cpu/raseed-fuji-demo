import { describe, it, expect } from "vitest";
import { isProtectedRoute } from "@/lib/auth/routes";

describe("Route Protection Guard (isProtectedRoute)", () => {
  it("returns false for null, undefined, and empty strings", () => {
    expect(isProtectedRoute(null)).toBe(false);
    expect(isProtectedRoute(undefined)).toBe(false);
    expect(isProtectedRoute("")).toBe(false);
    expect(isProtectedRoute("   ")).toBe(false);
  });

  it("returns false for all public routes", () => {
    expect(isProtectedRoute("/")).toBe(false);
    expect(isProtectedRoute("/pay")).toBe(false);
    expect(isProtectedRoute("/pay/inv-12345")).toBe(false);
    expect(isProtectedRoute("/pay/0xabcdef123456")).toBe(false);
    expect(isProtectedRoute("/about")).toBe(false);
    expect(isProtectedRoute("/about/how-it-works")).toBe(false);
    expect(isProtectedRoute("/security")).toBe(false);
    expect(isProtectedRoute("/legal/terms")).toBe(false);
    expect(isProtectedRoute("/legal/privacy")).toBe(false);
    expect(isProtectedRoute("/legal/risks")).toBe(false);
    expect(isProtectedRoute("/apple-touch-icon.png")).toBe(false);
  });

  it("returns true for protected merchant routes under /app", () => {
    expect(isProtectedRoute("/app")).toBe(true);
    expect(isProtectedRoute("/app/")).toBe(true);
    expect(isProtectedRoute("/app/invoices")).toBe(true);
    expect(isProtectedRoute("/app/invoices/new")).toBe(true);
    expect(isProtectedRoute("/app/invoices/inv-123")).toBe(true);
    expect(isProtectedRoute("/app/settings")).toBe(true);
  });

  it("does not false-positive on prefix collisions", () => {
    expect(isProtectedRoute("/application")).toBe(false);
    expect(isProtectedRoute("/apple")).toBe(false);
    expect(isProtectedRoute("/app-overview")).toBe(false);
  });
});
