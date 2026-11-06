import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/auth";
import { ok } from "@/lib/api";
import { ensureAuditTrailColumns } from "@/lib/provision";

// The before/after of every correction and deletion made to *this member's*
// payments. The rows already exist — lib/auth.audit() writes a PAYMENT_CORRECTED
// or PAYMENT_DELETED entry whenever the payments/[id] route rewrites recorded
// income — this endpoint only collects the ones belonging to one member.
//
// The member id lives inside the details JSON rather than in a column, so the
// query narrows to payment-entity rows in SQL and the member match is done by
// parsing each entry. Bounded by `take` because a single member's correction
// history is small even though the trust-wide log is not.
export async function GET(req, { params }) {
  const { error } = await guard("payments:correct");
  if (error) return error;
  const { id } = await params;
  const memberId = Number(id);

  // The details/oldValue/hash columns are additive; make sure they exist first.
  await ensureAuditTrailColumns();
  const rows = await prisma.auditLog.findMany({
    where: { entity: "Payment", action: { in: ["PAYMENT_CORRECTED", "PAYMENT_DELETED"] } },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const entries = [];
  for (const row of rows) {
    let details = null;
    try { details = row.details ? JSON.parse(row.details) : null; } catch { continue; }
    if (!details || details.memberId !== memberId) continue;
    entries.push({
      id: row.id,
      action: row.action,
      at: row.createdAt,
      by: row.user?.name || "Unknown",
      before: details.before ?? null,
      after: details.after ?? null,
      amount: details.amount ?? null,
      date: details.date ?? null,
      reference: details.reference ?? null,
      incomeSynced: details.incomeSynced ?? details.incomeDeleted ?? null,
    });
  }

  return ok(entries);
}
