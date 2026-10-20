import { prisma } from "@/lib/prisma";
import { guard, audit, verifyConfirmToken } from "@/lib/auth";
import { ok, bad } from "@/lib/api";
import { ensureMemberRecordColumns } from "@/lib/provision";
import { incomeDescription } from "@/lib/payment-income";
import { METHOD_LABELS } from "@/lib/format";
import { resyncIncomeTransaction, deleteSourceTransaction } from "@/lib/ledger";

// Correcting a payment that has already been captured rewrites the Trust's recorded
// income, so it is held behind payments:correct (administrators only) *and* a fresh
// password confirmation, unlike simply adding a new payment.
async function authorize(req, params) {
  const { user, error } = await guard("payments:correct");
  if (error) return { error };

  // The body is read once here and handed back, because a request stream cannot be
  // parsed twice. DELETE callers send the token as a query parameter instead.
  const body = await req.json().catch(() => ({}));
  const token = req.nextUrl.searchParams.get("confirmToken") || body.confirmToken;
  if (!(await verifyConfirmToken(token))) {
    return { error: bad("Password confirmation required or expired. Please try again.", 401) };
  }

  const { id } = await params;
  // Awaited before the query: `include: { income }` selects Income.paymentId.
  await ensureMemberRecordColumns();
  const payment = await prisma.payment.findUnique({
    where: { id: Number(id) },
    include: { member: { include: { plots: true } }, plot: true, income: true },
  });
  if (!payment) return { error: bad("Payment not found", 404) };
  return { user, payment, body };
}

export async function PUT(req, { params }) {
  const { user, payment, body: b, error } = await authorize(req, params);
  if (error) return error;
  const member = payment.member;

  const data = {};
  if ("amount" in b) {
    const n = Number(b.amount);
    if (!Number.isFinite(n) || n <= 0) return bad("A positive amount is required.");
    data.amount = n;
  }
  if ("date" in b) {
    const d = new Date(b.date);
    if (!b.date || Number.isNaN(d.getTime())) return bad("Payment date is not a valid date.");
    data.date = d;
  }
  if ("method" in b) {
    if (!(b.method in METHOD_LABELS)) return bad("That payment method is not recognised.");
    data.method = b.method;
  }
  if ("reference" in b) data.reference = b.reference ? String(b.reference).trim() : null;
  if ("note" in b) data.note = b.note ? String(b.note).trim() : null;
  if ("plotId" in b) {
    if (b.plotId === "" || b.plotId == null) data.plotId = null;
    else {
      // A correction must not be able to move money onto an erf this member does not
      // hold, which would silently change somebody else's balance.
      const pid = Number(b.plotId);
      if (!member.plots.some((p) => p.id === pid)) return bad("That plot does not belong to this member.");
      data.plotId = pid;
    }
  }
  if (Object.keys(data).length === 0) return bad("Nothing to update.");

  const before = {
    amount: payment.amount,
    date: payment.date,
    method: payment.method,
    reference: payment.reference,
    note: payment.note,
    plotId: payment.plotId,
  };
  const nextPlot =
    "plotId" in data ? member.plots.find((p) => p.id === data.plotId) ?? null : payment.plot;

  const updated = await prisma.$transaction(async (tx) => {
    const p = await tx.payment.update({ where: { id: payment.id }, data });
    // The income row this payment generated has to follow it, or the cashflow report
    // and the member's statement would disagree about money the Trust received.
    if (payment.income) {
      const description = incomeDescription(member.fullName, nextPlot?.number);
      await tx.income.update({
        where: { id: payment.income.id },
        data: {
          date: p.date,
          amount: p.amount,
          method: p.method,
          reference: p.reference,
          description,
        },
      });
      // And the formal ledger posting behind that income row follows too, rescaling
      // its journal lines and jar allocations by the snapshotted percentages.
      await resyncIncomeTransaction(tx, payment.income.id, {
        amount: p.amount,
        date: p.date,
        description,
      });
    }
    return p;
  });

  await audit(user, "PAYMENT_CORRECTED", "Payment", payment.id, {
    memberId: member.id,
    before,
    after: data,
    incomeSynced: Boolean(payment.income),
  });
  // incomeSynced is false for payments captured before the link existed: their income
  // row cannot be matched reliably, so Finance has to correct that one by hand.
  return ok({ ...updated, incomeSynced: Boolean(payment.income) });
}

export async function DELETE(req, { params }) {
  const { user, payment, error } = await authorize(req, params);
  if (error) return error;

  await prisma.$transaction(async (tx) => {
    // Deleted explicitly rather than left to the ON DELETE SET NULL on the link: an
    // income row with no payment would keep counting money the Trust never received.
    if (payment.income) {
      // Its ledger posting and jar allocations go with it, so the books and the jar
      // balances stop counting the reversed payment.
      await deleteSourceTransaction(tx, "INCOME", payment.income.id);
      await tx.income.delete({ where: { id: payment.income.id } });
    }
    await tx.payment.delete({ where: { id: payment.id } });
  });

  await audit(user, "PAYMENT_DELETED", "Payment", payment.id, {
    memberId: payment.memberId,
    amount: payment.amount,
    date: payment.date,
    reference: payment.reference,
    incomeDeleted: Boolean(payment.income),
  });
  return ok({ ok: true, incomeSynced: Boolean(payment.income) });
}
