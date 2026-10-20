import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, bad, created } from "@/lib/api";
import { ledgerReady, postExpense, assertJarHasFunds } from "@/lib/ledger";

// Reading the expense list stays open to every administrator; logging or removing an
// expense moves money in the formal books and draws down a budget jar, so it is held
// behind finance:admin (Main Administrator and Finance Admin only).
export async function GET(req) {
  const { error } = await guard("finance:view");
  if (error) return error;
  const sp = req.nextUrl.searchParams;
  const where = {};
  if (sp.get("from")) where.date = { ...where.date, gte: new Date(sp.get("from")) };
  if (sp.get("to")) where.date = { ...where.date, lte: new Date(sp.get("to")) };
  if (sp.get("category")) where.category = sp.get("category");
  const expenses = await prisma.expense.findMany({ where, orderBy: { date: "desc" }, take: 500 });
  return ok(expenses);
}

export async function POST(req) {
  const { user, error } = await guard("finance:admin");
  if (error) return error;
  try {
    const b = await req.json();
    if (!b.description || !b.amount) return bad("Description and amount are required");
    const amount = Number(b.amount);
    if (!Number.isFinite(amount) || amount <= 0) return bad("A positive amount is required");
    const budgetCategoryId = b.budgetCategoryId ? Number(b.budgetCategoryId) : null;
    if (!budgetCategoryId) return bad("Choose the budget category this expense is paid from.");

    const accountIds = await ledgerReady();
    const date = b.date ? new Date(b.date) : new Date();

    const record = await prisma.$transaction(async (tx) => {
      // Draw-down check runs inside the transaction so the balance reflects any
      // concurrent posting. Throws INSUFFICIENT_FUNDS when the jar cannot cover it.
      await assertJarHasFunds(tx, budgetCategoryId, amount);
      const expense = await tx.expense.create({
        data: {
          date,
          description: b.description,
          category: b.category || "OTHER",
          amount,
          vendor: b.vendor || null,
          project: b.project || "River Edge Rural Village",
        },
      });
      // The expense journal line carries the jar, which is what reduces its
      // available balance in every report derived from the ledger.
      await postExpense(tx, expense, accountIds, { createdById: user.id, budgetCategoryId });
      return expense;
    });

    await audit(user, "EXPENSE_CREATED", "Expense", record.id, record, null, { ...record, budgetCategoryId });
    return created(record);
  } catch (e) {
    if (e.code === "INSUFFICIENT_FUNDS") return bad("Insufficient funds in this category.");
    return bad(e.message);
  }
}

export async function DELETE(req) {
  const { user, error } = await guard("finance:admin");
  if (error) return error;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return bad("id is required");
  const expense = await prisma.expense.findUnique({ where: { id: Number(id) } });
  if (!expense) return bad("Expense not found", 404);

  await prisma.$transaction(async (tx) => {
    // Remove the ledger posting with it, so the expense stops drawing down its jar
    // and drops out of the reports. Journal lines cascade from the transaction.
    await tx.transaction.deleteMany({ where: { sourceType: "EXPENSE", sourceId: expense.id } });
    await tx.expense.delete({ where: { id: expense.id } });
  });
  await audit(user, "EXPENSE_DELETED", "Expense", id, null, expense, null);
  return ok({ ok: true });
}
