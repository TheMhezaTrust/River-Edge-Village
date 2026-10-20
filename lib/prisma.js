import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// The generated client selects every column of a model, so a new column has to
// exist before the first query against that model anywhere in the app — not
// merely before the first request that uses the new field. Member, Plot and
// Income are all read by staff screens and, for Plot, by public pages too.
// MemberDocument is read by the portal and by a member's staff record. AuditLog
// gained the before/after and hash-chain columns, and it is written on nearly
// every staff action, so those columns must exist before the first audit write.
// The ledger tables back the new finance screens; they are started here too so a
// cold-start report does not race their creation. The DDL is idempotent and cached
// per instance; it is deliberately not awaited so a cold start is not blocked and a
// database hiccup cannot take the app down. Routes that read a new column or table
// await the same cached promise themselves.
if (!globalForPrisma.__mhezaProvisionStarted) {
  globalForPrisma.__mhezaProvisionStarted = true;
  import("./provision.js")
    .then((m) =>
      Promise.all([
        m.ensureMemberAccessTables(),
        m.ensurePlotCertificateColumn(),
        m.ensureMemberRecordColumns(),
        m.ensureMemberDocumentColumns(),
        m.ensureAuditTrailColumns(),
        m.ensureLedgerTables(),
      ])
    )
    .catch(() => {});
}
