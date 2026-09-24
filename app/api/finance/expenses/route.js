import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, bad, created } from "@/lib/api";

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
  const { user, error } = await guard("finance:manage");
  if (error) return error;
  try {
    const b = await req.json();
    if (!b.description || !b.amount) return bad("Description and amount are required");
    const record = await prisma.expense.create({
      data: {
        date: b.date ? new Date(b.date) : new Date(),
        description: b.description,
        category: b.category || "OTHER",
        amount: Number(b.amount),
        vendor: b.vendor || null,
        project: b.project || "River Edge Rural Village",
      },
    });
    await audit(user, "EXPENSE_CREATED", "Expense", record.id, record);
    return created(record);
  } catch (e) {
    return bad(e.message);
  }
}

export async function DELETE(req) {
  const { user, error } = await guard("finance:manage");
  if (error) return error;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return bad("id is required");
  await prisma.expense.delete({ where: { id: Number(id) } });
  await audit(user, "EXPENSE_DELETED", "Expense", id);
  return ok({ ok: true });
}
