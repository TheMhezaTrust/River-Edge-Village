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
  const income = await prisma.income.findMany({ where, orderBy: { date: "desc" }, take: 500 });
  return ok(income);
}

export async function POST(req) {
  const { user, error } = await guard("finance:manage");
  if (error) return error;
  try {
    const b = await req.json();
    if (!b.description || !b.amount) return bad("Description and amount are required");
    const record = await prisma.income.create({
      data: {
        date: b.date ? new Date(b.date) : new Date(),
        description: b.description,
        project: b.project || "River Edge Rural Village",
        amount: Number(b.amount),
        category: b.category || "OTHER",
        method: b.method || null,
        reference: b.reference || null,
      },
    });
    await audit(user, "INCOME_CREATED", "Income", record.id, record);
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
  await prisma.income.delete({ where: { id: Number(id) } });
  await audit(user, "INCOME_DELETED", "Income", id);
  return ok({ ok: true });
}
