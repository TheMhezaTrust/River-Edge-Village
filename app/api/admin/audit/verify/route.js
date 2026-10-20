import { prisma } from "@/lib/prisma";
import { guard, computeAuditHash } from "@/lib/auth";
import { ok } from "@/lib/api";
import { ensureAuditTrailColumns } from "@/lib/provision";

// Recompute the tamper-evident hash chain over the audit log. Each row's stored
// entryHash is recalculated from its own contents plus the previous row's hash; a
// mismatch means the row was altered, and a prevHash that does not match the row
// before it means the log was reordered, truncated or had a row inserted. Rows
// written before the chain existed have no hash and are reported separately as
// legacy rather than as failures.
export async function GET() {
  const { error } = await guard("audit:view");
  if (error) return error;
  await ensureAuditTrailColumns();

  const rows = await prisma.auditLog.findMany({ orderBy: { id: "asc" } });

  let chained = 0;
  let legacy = 0;
  const broken = [];
  const prevHashCounts = new Map();
  let expectedPrev = "GENESIS";

  for (const row of rows) {
    if (!row.entryHash) {
      // Pre-chain entry: nothing to verify, and it cannot anchor the next row.
      legacy++;
      continue;
    }
    const recomputed = computeAuditHash(row);
    if (recomputed !== row.entryHash) {
      broken.push({ id: row.id, reason: "hash mismatch — contents altered" });
    } else if (row.prevHash !== expectedPrev) {
      // The row's own hash is valid but it does not follow the previous one: a
      // reorder, a deletion, or a concurrent write that forked the chain.
      broken.push({ id: row.id, reason: `chain break — expected prev ${expectedPrev.slice(0, 12)}, found ${(row.prevHash || "").slice(0, 12)}` });
    } else {
      chained++;
    }
    prevHashCounts.set(row.prevHash, (prevHashCounts.get(row.prevHash) || 0) + 1);
    expectedPrev = row.entryHash;
  }

  const forks = [...prevHashCounts.values()].filter((n) => n > 1).length;

  return ok({
    total: rows.length,
    chained,
    legacy,
    brokenCount: broken.length,
    broken: broken.slice(0, 50),
    forks,
    intact: broken.length === 0,
  });
}
