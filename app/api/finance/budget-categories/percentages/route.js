import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, bad } from "@/lib/api";
import { seedLedger } from "@/lib/ledger";

// Set every active jar's share in one operation. The total must be exactly 100% —
// the split engine routes each incoming payment by these percentages, so a total
// under or over 100 would under- or over-allocate real money. Changing them affects
// future payments only; past allocations keep the percentage snapshotted at the time.
export async function PUT(req) {
  const { user, error } = await guard("finance:admin");
  if (error) return error;
  try {
    await seedLedger();
    const b = await req.json();
    const entries = Array.isArray(b.percentages) ? b.percentages : null;
    if (!entries || entries.length === 0) return bad("No percentages supplied.");

    const categories = await prisma.budgetCategory.findMany({ where: { isActive: true } });
    const byId = new Map(categories.map((c) => [c.id, c]));

    // Every active jar must be given a share, and only active jars may be set, so
    // the caller cannot quietly leave one out and break the 100% total.
    const seen = new Set();
    const updates = [];
    for (const e of entries) {
      const id = Number(e.id);
      const pct = Number(e.percentage);
      if (!byId.has(id)) return bad(`Category ${id} is not an active category.`);
      if (!Number.isFinite(pct) || pct < 0) return bad("Percentages must be zero or more.");
      seen.add(id);
      updates.push({ id, percentage: Math.round(pct * 100) / 100 });
    }
    for (const c of categories) {
      if (!seen.has(c.id)) return bad(`"${c.name}" is missing a percentage. Every active category needs one.`);
    }

    const total = Math.round(updates.reduce((s, u) => s + u.percentage, 0) * 100) / 100;
    if (Math.abs(total - 100) > 0.01) {
      return bad(`The percentages must total exactly 100% (currently ${total}%).`);
    }

    const before = categories.map((c) => ({ id: c.id, name: c.name, percentage: c.percentage }));
    await prisma.$transaction(
      updates.map((u) => prisma.budgetCategory.update({ where: { id: u.id }, data: { percentage: u.percentage } })),
    );
    const after = await prisma.budgetCategory.findMany({ where: { isActive: true }, select: { id: true, name: true, percentage: true } });
    await audit(user, "BUDGET_PERCENTAGES_UPDATED", "BudgetCategory", null, { total }, before, after);
    return ok({ ok: true, total });
  } catch (e) {
    return bad(e.message);
  }
}
