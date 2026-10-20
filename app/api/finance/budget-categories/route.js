import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, bad, created } from "@/lib/api";
import { seedLedger, jarBalances } from "@/lib/ledger";

// Budget categories ("jars"). Reading them is open to every administrator through
// finance:view; changing them is held behind finance:admin (Main Administrator and
// the Finance Admin role only).
export async function GET() {
  const { error } = await guard("finance:view");
  if (error) return error;
  await seedLedger();
  const categories = await jarBalances();
  const activeTotal = categories
    .filter((c) => c.isActive)
    .reduce((s, c) => s + c.percentage, 0);
  return ok({ categories, activePercentageTotal: Math.round(activeTotal * 100) / 100 });
}

export async function POST(req) {
  const { user, error } = await guard("finance:admin");
  if (error) return error;
  try {
    await seedLedger();
    const b = await req.json();
    const name = String(b.name || "").trim();
    if (!name) return bad("A category name is required.");
    const existing = await prisma.budgetCategory.findUnique({ where: { name } });
    if (existing) return bad("A category with that name already exists.");

    // New jars start at 0% so the active total stays at 100 until the Admin
    // deliberately rebalances. Splitting is by percentage, so a 0% jar simply
    // receives nothing until it is given a share.
    const last = await prisma.budgetCategory.aggregate({ _max: { sortOrder: true } });
    const category = await prisma.budgetCategory.create({
      data: { name, percentage: 0, sortOrder: (last._max.sortOrder || 0) + 10, isActive: true },
    });
    await audit(user, "BUDGET_CATEGORY_CREATED", "BudgetCategory", category.id, { name }, null, { name, percentage: 0 });
    return created(category);
  } catch (e) {
    return bad(e.message);
  }
}
