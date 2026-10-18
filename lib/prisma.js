import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// The generated client selects every column of a model, so a new column has to
// exist before the first query against that model anywhere in the app — not
// merely before the first request that uses the new field. Plot is read by the
// public homepage and project pages as well as the portal, and Member by nearly
// every staff screen. The DDL is idempotent and cached per instance; it is
// deliberately not awaited so a cold start is not blocked and a database hiccup
// cannot take the app down.
if (!globalForPrisma.__mhezaProvisionStarted) {
  globalForPrisma.__mhezaProvisionStarted = true;
  import("./provision.js")
    .then((m) => Promise.all([m.ensureMemberAccessTables(), m.ensurePlotCertificateColumn()]))
    .catch(() => {});
}
