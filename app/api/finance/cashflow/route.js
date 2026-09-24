import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/auth";
import { ok } from "@/lib/api";

// Cash flow / P&L summary grouped by month for the last 12 months
export async function GET() {
  const { error } = await guard("finance:view");
  if (error) return error;
  const since = new Date();
  since.setMonth(since.getMonth() - 11);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const [income, expenses] = await Promise.all([
    prisma.income.findMany({ where: { date: { gte: since } } }),
    prisma.expense.findMany({ where: { date: { gte: since } } }),
  ]);

  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleString("en-ZA", { month: "short", year: "2-digit" }) });
  }
  const keyOf = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;

  const rows = months.map(({ key, label }) => {
    const inflow = income.filter((r) => keyOf(r.date) === key).reduce((s, r) => s + r.amount, 0);
    const outflow = expenses.filter((r) => keyOf(r.date) === key).reduce((s, r) => s + r.amount, 0);
    return { key, label, inflow, outflow, net: inflow - outflow };
  });

  let running = 0;
  for (const row of rows) {
    running += row.net;
    row.closingBalance = running;
  }

  const totals = {
    incomeAll: await prisma.income.aggregate({ _sum: { amount: true } }),
    expenseAll: await prisma.expense.aggregate({ _sum: { amount: true } }),
  };
  const totalIncome = totals.incomeAll._sum.amount || 0;
  const totalExpenses = totals.expenseAll._sum.amount || 0;

  return ok({
    months: rows,
    totals: {
      totalIncome,
      totalExpenses,
      profit: totalIncome - totalExpenses,
      incomeThisMonth: rows[rows.length - 1].inflow,
      expenseThisMonth: rows[rows.length - 1].outflow,
    },
  });
}
