import { PrismaClient } from "../node_modules/.prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaPool: Pool | undefined;
  prismaAdapter: PrismaPg | undefined;
};

const connectionString = process.env.DATABASE_URL;

function createPrismaClient(): PrismaClient {
  if (!connectionString) {
    console.warn("DATABASE_URL is not set — database calls will fail at runtime.");
    return new Proxy({} as PrismaClient, {
      get(_, prop) {
        if (prop === "then") return undefined;
        throw new Error("DATABASE_URL is not set");
      },
    });
  }

  const pool =
    globalForPrisma.prismaPool ??
    new Pool({ connectionString });
  const adapter =
    globalForPrisma.prismaAdapter ??
    new PrismaPg(pool);

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prismaPool = pool;
    globalForPrisma.prismaAdapter = adapter;
  }

  return new PrismaClient({ adapter });
}

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
