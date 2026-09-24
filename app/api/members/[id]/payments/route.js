import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, bad, created } from "@/lib/api";

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
        date: b.date ? new Date(b.date) : new Date(),
        method: b.method || "EFT",
        reference: b.reference || null,
        note: b.note || null,
        memberId: member.id,
        plotId: plot?.id ?? null,
      },
    });
    await prisma.income.create({
      data: { date: payment.date, description: `Payment from ${member.fullName}${plot ? ` (Plot ${plot.number})` : ""}`, project: "River Edge Rural Village", amount, category: "PLOT_SALE", method: payment.method, reference: payment.reference },
    });
    await prisma.notification.create({ data: { text: `Payment received: R${amount.toLocaleString("en-ZA")} from ${member.fullName}`, type: "PAYMENT" } });
    await audit(user, "PAYMENT_RECORDED", "Payment", payment.id, { memberId: member.id, amount });
    return created(payment);
  } catch (e) {
    return bad(e.message);
  }
}
