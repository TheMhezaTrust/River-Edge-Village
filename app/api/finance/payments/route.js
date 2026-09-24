import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/auth";
import { ok } from "@/lib/api";
import { memberPrice } from "@/lib/member-totals";

// Payment tracking: member balances + payment history
export async function GET() {
  const { error } = await guard("finance:view");
  if (error) return error;
  const members = await prisma.member.findMany({
    include: { plots: true, payments: { orderBy: { date: "desc" } } },
    orderBy: { fullName: "asc" },
  });
  const rows = members.map((m) => {
    const totalPaid = m.payments.reduce((s, p) => s + p.amount, 0);
    const price = memberPrice(m);
    return {
      id: m.id,
      fullName: m.fullName,
      email: m.email,
      phone: m.phone,
      plotNumber: m.plots.length ? m.plots.map((p) => p.number).join(", ") : null,
      price,
      totalPaid,
      outstandingBalance: Math.max(0, price - totalPaid),
      lastPaymentDate: m.payments[0]?.date ?? null,
      payments: m.payments,
    };
  });
  return ok(rows);
}
