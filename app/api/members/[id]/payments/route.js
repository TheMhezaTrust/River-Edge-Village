import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, bad, created } from "@/lib/api";
import { ensureMemberRecordColumns } from "@/lib/provision";
import { incomeDescription, INCOME_PROJECT } from "@/lib/payment-income";
import { ledgerReady, postIncome, splitIntoJars, assertPeriodOpen } from "@/lib/ledger";

// Record a payment for a member
export async function POST(req, { params }) {
  const { user, error } = await guard("finance:manage");
  if (error) return error;
  const { id } = await params;
  try {
    const b = await req.json();
    const amount = Number(b.amount);
    if (!amount || amount <= 0) return bad("A positive amount is required");
    const member = await prisma.member.findUnique({ where: { id: Number(id) }, include: { plots: true } });
    if (!member) return bad("Member not found", 404);
    const payDate = b.date ? new Date(b.date) : new Date();
    await assertPeriodOpen(payDate);
    // A payment applies to a specific plot when the member owns several; default
    // to their only plot when unambiguous, otherwise leave it unallocated.
    const plot = b.plotId
      ? member.plots.find((p) => p.id === Number(b.plotId)) ?? null
      : member.plots.length === 1
        ? member.plots[0]
        : null;
    const payment = await prisma.payment.create({
      data: {
        amount,
        date: payDate,
        method: b.method || "EFT",
        reference: b.reference || null,
        note: b.note || null,
        memberId: member.id,
        plotId: plot?.id ?? null,
      },
    });
    // The link lets a later correction to this payment correct its income row too,
    // so the cashflow report cannot drift away from the member's statement. Both
    // columns the ledger needs (Income.paymentId and the ledger tables) are
    // provisioned before the transaction that writes them.
    await ensureMemberRecordColumns();
    const accountIds = await ledgerReady();
    const income = await prisma.$transaction(async (tx) => {
      const inc = await tx.income.create({
        data: { date: payment.date, description: incomeDescription(member.fullName, plot?.number), project: INCOME_PROJECT, amount, category: "PLOT_SALE", method: payment.method, reference: payment.reference, paymentId: payment.id },
      });
      // Post into the formal ledger and split across the jars at the percentages in
      // force now. The split snapshots those percentages, so a later change never
      // rewrites this payment's allocation.
      const txn = await postIncome(tx, inc, accountIds, user.id);
      await splitIntoJars(tx, txn.id, inc.amount);
      return inc;
    });
    await prisma.notification.create({ data: { text: `Payment received: R${amount.toLocaleString("en-ZA")} from ${member.fullName}`, type: "PAYMENT" } });
    await audit(user, "PAYMENT_RECORDED", "Payment", payment.id, { memberId: member.id, amount });
    return created({ ...payment, incomeId: income.id });
  } catch (e) {
    if (e.code === "PERIOD_LOCKED") return bad(e.message, 409);
    return bad(e.message);
  }
}
