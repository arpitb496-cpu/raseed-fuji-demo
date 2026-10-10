import { PrismaClient } from "@prisma/client";

// Fail-fast guard: in-memory store is strictly forbidden in production
if (process.env.NODE_ENV === "production" && process.env.USE_MEMORY_STORE === "true") {
  throw new Error(
    "SECURITY CONFIGURATION ERROR: In-memory store (USE_MEMORY_STORE=true) is strictly forbidden in production."
  );
}

const isUnitTestMemory = process.env.USE_MEMORY_STORE === "true";

const globalForPrisma = globalThis as unknown as {
  prismaClient: PrismaClient | undefined;
};

function getPrismaInstance(): PrismaClient {
  if (isUnitTestMemory) {
    // Only loaded if explicitly requested in unit tests
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { inMemoryDb } = require("./memory-store");
    return inMemoryDb as unknown as PrismaClient;
  }

  if (!globalForPrisma.prismaClient) {
    globalForPrisma.prismaClient = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }
  return globalForPrisma.prismaClient;
}

export const prisma: PrismaClient = getPrismaInstance();

if (process.env.NODE_ENV !== "production" && !isUnitTestMemory) {
  globalForPrisma.prismaClient = prisma;
}
