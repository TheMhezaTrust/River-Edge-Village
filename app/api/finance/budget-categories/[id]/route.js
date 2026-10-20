import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, bad } from "@/lib/api";
import { seedLedger, jarBalances } from "@/lib/ledger";
import { zarFull } from "@/lib/format";

// Rename / activate / deactivate a single jar, and delete it under the balance
// safeguard. Percentages are edited in bulk through the /percentages route so the
// 100% invariant is enforced in one place.
export async function PUT(req, { params }) {
  const { user, error } = await guard("finance:admin");
  if (error) return error;
  const { id } = await params;
  await seedLedger();
  const category = await prisma.budgetCategory.findUnique({ where: { id: Number(id) } });
  if (!category) return bad("Category not found", 404);

  const b = await req.json().catch(() => ({}));
  const data = {};
  if ("name" in b) {
    const name = String(b.name || "").trim();
    if (!name) return bad("A category name is required.");
    const clash = await prisma.budgetCategory.findUnique({ where: { name } });
    if (clash && clash.id !== category.id) return bad("A category with that name already exists.");
    data.name = name;
  }
  if ("isActive" in b) data.isActive = Boolean(b.isActive);

  if (Object.keys(data).length === 0) return bad("Nothing to update.");
  const updated = await prisma.budgetCategory.update({ where: { id: category.id }, data });
  await audit(user, "BUDGET_CATEGORY_UPDATED", "BudgetCategory", category.id, data, category, updated);
  return ok(updated);
}

export async function DELETE(req, { params }) {
  const { user, error } = await guard("finance:admin");
  if (error) return error;
  const { id } = await params;
  await seedLedger();
  const category = await prisma.budgetCategory.findUnique({ where: { id: Number(id) } });
  if (!category) return bad("Category not found", 404);

  // Delete safeguard: a jar still holding money cannot be removed. The Admin must
  // transfer the balance out first, so no allocated fund silently disappears.
  const balances = await jarBalances();
  const bal = balances.find((c) => c.id === category.id);
  if (bal && bal.available > 0.005) {
    return bad(
      `This category still holds ${zarFull(bal.available)}. Transfer the remaining funds to another category before deleting it.`,
    );
  }

  // Historical allocations and journal lines point at this jar with ON DELETE
  // RESTRICT, so a jar that has ever been used is deactivated rather than erased —
  // an auditor must still be able to see where past money went. A never-used jar is
  // removed outright.
  const [allocCount, lineCount] = await Promise.all([
    prisma.allocation.count({ where: { budgetCategoryId: category.id } }),
    prisma.journalLine.count({ where: { budgetCategoryId: category.id } }),
  ]);

  if (allocCount === 0 && lineCount === 0) {
    await prisma.budgetCategory.delete({ where: { id: category.id } });
    await audit(user, "BUDGET_CATEGORY_DELETED", "BudgetCategory", category.id, { name: category.name }, category, null);
    return ok({ ok: true, deleted: true });
  }

  const deactivated = await prisma.budgetCategory.update({
    where: { id: category.id },
    data: { isActive: false, percentage: 0 },
  });
  await audit(user, "BUDGET_CATEGORY_ARCHIVED", "BudgetCategory", category.id, { reason: "has history" }, category, deactivated);
  return ok({ ok: true, deleted: false, archived: true });
}
