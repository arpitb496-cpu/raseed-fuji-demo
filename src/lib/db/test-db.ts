import { PrismaClient } from "@prisma/client";

/**
 * Returns a dedicated PrismaClient instance strictly isolated to TEST_DATABASE_URL.
 * Aborts if TEST_DATABASE_URL is missing or equals the runtime DATABASE_URL.
 */
export function getTestPrisma(): PrismaClient {
  const prodUrl = process.env.DATABASE_URL;
  const testUrl = process.env.TEST_DATABASE_URL;

  if (!testUrl || testUrl.trim() === "") {
    throw new Error(
      "TEST ISOLATION ERROR: TEST_DATABASE_URL is not configured. Integration tests require a dedicated test database."
    );
  }

  if (prodUrl && prodUrl.trim() === testUrl.trim()) {
    throw new Error(
      "TEST ISOLATION GUARD: TEST_DATABASE_URL must never match DATABASE_URL. Aborting immediately to prevent test pollution in production/runtime database."
    );
  }

  return new PrismaClient({
    datasources: {
      db: {
        url: testUrl,
      },
    },
    log: ["error"],
  });
}
