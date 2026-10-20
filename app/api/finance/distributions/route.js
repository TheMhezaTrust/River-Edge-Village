import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, bad, created } from "@/lib/api";
import { ledgerReady, postDistribution, deleteSourceTransaction, assertPeriodOpen, saTaxYearRange } from "@/lib/ledger";

const NATURES = ["INCOME_DISTRIBUTION", "CAPITAL_RETURN"];

// The distributions register: money the Trust pays OUT to a beneficiary. This is
// what an annual IT3(t) is generated from, so it stays empty until a real payout is
// recorded — an empty register is the truthful state, not missing data.
export async function GET(req) {
  const { error } = await guard("finance:view");
  if (error) return error;
  const sp = req.nextUrl.searchParams;
  const where = {};
  const taxYear = sp.get("taxYear");
  if (taxYear) {
    const { start, end } = saTaxYearRange(taxYear);
    where.date = { gte: start, lte: end };
  }
  const distributions = await prisma.distribution.findMany({ where, orderBy: { date: "desc" }, take: 500 });
  return ok(distributions);
}

export async function POST(req) {
  const { user, error } = await guard("finance:admin");
  if (error) return error;
  try {
    const b = await req.json();
    const recipientName = String(b.recipientName || "").trim();
    if (!recipientName) return bad("A recipient name is required.");
    const amount = Number(b.amount);
    if (!Number.isFinite(amount) || amount <= 0) return bad("A positive amount is required.");
    const nature = NATURES.includes(b.nature) ? b.nature : "INCOME_DISTRIBUTION";
    const date = b.date ? new Date(b.date) : new Date();
    if (Number.isNaN(date.getTime())) return bad("A valid date is required.");
    await assertPeriodOpen(date);

    const accountIds = await ledgerReady();
    const record = await prisma.$transaction(async (tx) => {
      const dist = await tx.distribution.create({
        data: {
          date,
          recipientName,
          recipientIdNumber: b.recipientIdNumber ? String(b.recipientIdNumber).trim() : null,
          memberId: b.memberId ? Number(b.memberId) : null,
          amount,
          nature,
          note: b.note ? String(b.note).trim() : null,
          createdById: user.id,
        },
      });
      const txn = await postDistribution(tx, dist, accountIds, user.id);
      return tx.distribution.update({ where: { id: dist.id }, data: { transactionId: txn.id } });
    });

    await audit(user, "DISTRIBUTION_CREATED", "Distribution", record.id, { recipientName, amount, nature }, null, record);
    return created(record);
  } catch (e) {
    if (e.code === "PERIOD_LOCKED") return bad(e.message, 409);
    return bad(e.message);
  }
}

export async function DELETE(req) {
  const { user, error } = await guard("finance:admin");
  if (error) return error;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return bad("id is required");
  const dist = await prisma.distribution.findUnique({ where: { id: Number(id) } });
  if (!dist) return bad("Distribution not found", 404);
  try {
    await assertPeriodOpen(dist.date);
  } catch (e) {
    if (e.code === "PERIOD_LOCKED") return bad(e.message, 409);
    throw e;
  }
  await prisma.$transaction(async (tx) => {
    await deleteSourceTransaction(tx, "DISTRIBUTION", dist.id);
    await tx.distribution.delete({ where: { id: dist.id } });
  });
  await audit(user, "DISTRIBUTION_DELETED", "Distribution", dist.id, null, dist, null);
  return ok({ ok: true });
}
