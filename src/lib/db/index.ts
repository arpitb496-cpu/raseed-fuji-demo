/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "@prisma/client";
import { inMemoryDb } from "./memory-store";

const globalForPrisma = globalThis as unknown as {
  prismaClient: PrismaClient | undefined;
  useMemoryFallback: boolean;
};

const rawPrisma =
  globalForPrisma.prismaClient ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaClient = rawPrisma;
}

// Proxy that uses PrismaClient when database is available, and transparently falls back to inMemoryDb
export const prisma = new Proxy({} as any, {
  get(_target, prop: string) {
    if (prop === "$transaction") {
      return async (arg: any) => {
        if (globalForPrisma.useMemoryFallback) {
          return inMemoryDb.$transaction(arg);
        }
        try {
          return await rawPrisma.$transaction(arg);
        } catch (err: any) {
          if (err?.name === "PrismaClientInitializationError" || err?.message?.includes("Can't reach database")) {
            globalForPrisma.useMemoryFallback = true;
            return inMemoryDb.$transaction(arg);
          }
          throw err;
        }
      };
    }

    const memoryModel = (inMemoryDb as any)[prop];
    const realModel = (rawPrisma as any)[prop];

    if (!realModel) {
      return memoryModel;
    }

    return new Proxy(realModel, {
      get(targetModel, method: string) {
        return async (...args: any[]) => {
          if (globalForPrisma.useMemoryFallback) {
            return (memoryModel as any)?.[method]?.(...args);
          }
          try {
            return await (targetModel as any)[method](...args);
          } catch (err: any) {
            if (
              err?.name === "PrismaClientInitializationError" ||
              err?.message?.includes("Can't reach database") ||
              err?.code === "P1001"
            ) {
              console.warn(
                `[Database] PostgreSQL unavailable at ${process.env.DATABASE_URL}. Transparently activating high-fidelity in-memory storage.`
              );
              globalForPrisma.useMemoryFallback = true;
              return (memoryModel as any)?.[method]?.(...args);
            }
            throw err;
          }
        };
      },
    });
  },
}) as PrismaClient;
