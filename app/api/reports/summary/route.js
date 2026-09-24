import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/auth";
import { ok } from "@/lib/api";
import { memberPrice } from "@/lib/member-totals";

export async function GET() {
  const { error } = await guard("reports:view");
  if (error) return error;

  const [plots, members, inquiries, income, expenses, payments] = await Promise.all([
    prisma.plot.findMany({ include: { payments: true } }),
    prisma.member.findMany({ include: { payments: true, plots: true } }),
    prisma.inquiry.findMany(),
    prisma.income.findMany(),
    prisma.expense.findMany(),
    prisma.payment.findMany(),
  ]);

  const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  // Sales by month (last 12)
  const salesByMonth = {};
  for (const p of payments) {
    const k = monthKey(p.date);
    salesByMonth[k] = (salesByMonth[k] || 0) + p.amount;
  }

  // Conversion funnel
  const inquiryStats = {
    total: inquiries.length,
    converted: inquiries.filter((i) => i.status === "CONVERTED").length,
    contacted: inquiries.filter((i) => i.status === "CONTACTED").length,
    new: inquiries.filter((i) => i.status === "NEW").length,
    closed: inquiries.filter((i) => i.status === "CLOSED").length,
  };
  inquiryStats.conversionRate = inquiryStats.total ? Math.round((inquiryStats.converted / inquiryStats.total) * 100) : 0;

  // Member payment status
  const memberStats = { paid: 0, partial: 0, outstanding: 0 };
  for (const m of members) {
    const paidAmt = m.payments.reduce((s, p) => s + p.amount, 0);
    const price = memberPrice(m);
    if (price === 0 || paidAmt >= price) memberStats.paid++;
    else if (paidAmt > 0) memberStats.partial++;
    else memberStats.outstanding++;
  }

  // Expense categories
  const expenseByCategory = {};
  for (const e of expenses) expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;

  return ok({
    salesByMonth,
    inquiryStats,
    memberStats,
    expenseByCategory,
    totals: {
      income: income.reduce((s, i) => s + i.amount, 0),
      expenses: expenses.reduce((s, e) => s + e.amount, 0),
      collected: payments.reduce((s, p) => s + p.amount, 0),
      plotsSold: plots.filter((p) => p.status === "SOLD").length,
      plotsReserved: plots.filter((p) => p.status === "RESERVED").length,
      plotsAvailable: plots.filter((p) => p.status === "AVAILABLE").length,
    },
  });
}
