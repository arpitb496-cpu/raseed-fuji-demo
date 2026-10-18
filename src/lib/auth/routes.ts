/**
 * Route protection utilities for Raseed Protocol.
 *
 * Strictly separates protected merchant management routes (/app/*)
 * from public-facing routes (/, /pay/*, /about/*, /security, /legal/*).
 */

export function isProtectedRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const cleanPath = pathname.trim();
  return cleanPath === "/app" || cleanPath.startsWith("/app/");
}
