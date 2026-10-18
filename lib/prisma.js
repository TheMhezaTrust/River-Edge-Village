import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// The generated client selects every Member column, so the two portal-access
// columns have to exist before the first member query anywhere in the app — not
// merely before the first portal request. The DDL is idempotent and cached per
// instance; it is deliberately not awaited so a cold start is not blocked and a
// database hiccup cannot take the app down.
if (!globalForPrisma.__mhezaProvisionStarted) {
  globalForPrisma.__mhezaProvisionStarted = true;
  import("./provision.js")
    .then((m) => m.ensureMemberAccessTables())
    .catch(() => {});
}
