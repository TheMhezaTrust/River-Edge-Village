import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, bad, created } from "@/lib/api";
import { ensureMemberRecordColumns } from "@/lib/provision";

export async function GET(req) {
  const { error } = await guard("finance:view");
  if (error) return error;
  const sp = req.nextUrl.searchParams;
  const where = {};
  if (sp.get("from")) where.date = { ...where.date, gte: new Date(sp.get("from")) };
  if (sp.get("to")) where.date = { ...where.date, lte: new Date(sp.get("to")) };
  if (sp.get("category")) where.category = sp.get("category");
  await ensureMemberRecordColumns();
  const income = await prisma.income.findMany({ where, orderBy: { date: "desc" }, take: 500 });
  return ok(income);
}

export async function POST(req) {
  const { user, error } = await guard("finance:manage");
  if (error) return error;
  try {
    const b = await req.json();
    if (!b.description || !b.amount) return bad("Description and amount are required");
    await ensureMemberRecordColumns();
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
  await ensureMemberRecordColumns();
  const record = await prisma.income.findUnique({ where: { id: Number(id) } });
  if (!record) return bad("Income record not found", 404);
  // This row is the accounting side of a member's payment. Removing it here would
  // leave the member's statement showing money the Trust's books no longer have, so
  // it has to be corrected on the member's record, where both sides move together.
  if (record.paymentId != null) {
    return bad("This income record came from a member payment. Correct or delete the payment on the member's record instead, so the statement and the books stay in step.");
  }
  await prisma.income.delete({ where: { id: record.id } });
  await audit(user, "INCOME_DELETED", "Income", id);
  return ok({ ok: true });
}
