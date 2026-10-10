/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "@prisma/client";
import { inMemoryDb } from "./memory-store";

// Fail-fast guard: in-memory store is strictly prohibited in production
if (process.env.NODE_ENV === "production" && process.env.USE_IN_MEMORY_DB === "true") {
  throw new Error(
    "SECURITY CONFIGURATION ERROR: In-memory database store is strictly prohibited in production."
  );
}

const isUnitTestMemory = process.env.USE_IN_MEMORY_DB === "true";

const globalForPrisma = globalThis as unknown as {
  prismaClient: PrismaClient | undefined;
};

export const prisma: PrismaClient = isUnitTestMemory
  ? (inMemoryDb as unknown as PrismaClient)
  : (globalForPrisma.prismaClient ??
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    }));

if (process.env.NODE_ENV !== "production" && !isUnitTestMemory) {
  globalForPrisma.prismaClient = prisma;
}
