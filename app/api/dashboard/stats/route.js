import { prisma } from "@/lib/prisma";
import { getStaffSession, unauthorized } from "@/lib/auth";
import { ok } from "@/lib/api";
import { memberPrice } from "@/lib/member-totals";

export async function GET() {
  const user = await getStaffSession();
  if (!user) return unauthorized();

  const [
    totalPlots, available, reserved, sold,
    totalMembers, incomeAgg, expenseAgg, payments, inquiries, tasks,
    recentAudit, notifications,
  ] = await Promise.all([
    prisma.plot.count(),
    prisma.plot.count({ where: { status: "AVAILABLE" } }),
    prisma.plot.count({ where: { status: "RESERVED" } }),
    prisma.plot.count({ where: { status: "SOLD" } }),
    prisma.member.count(),
    prisma.income.aggregate({ _sum: { amount: true } }),
    prisma.expense.aggregate({ _sum: { amount: true } }),
    prisma.payment.findMany({ select: { amount: true, date: true }, orderBy: { date: "desc" }, take: 500 }),
    prisma.inquiry.count({ where: { status: "NEW" } }),
    prisma.task.findMany({ where: { OR: [{ assignedTo: user.id }, { assignedTo: null }] }, take: 5, orderBy: { dueDate: "asc" } }),
    prisma.auditLog.findMany({ include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.notification.findMany({ where: { OR: [{ userId: user.id }, { userId: null }], isRead: false }, orderBy: { createdAt: "desc" }, take: 6 }),
  ]);

  const membersWithBalance = await prisma.member.findMany({
    include: { payments: true, plots: true },
  });
  const outstanding = membersWithBalance.reduce((s, m) => {
    const paid = m.payments.reduce((a, p) => a + p.amount, 0);
    const price = memberPrice(m);
    return s + Math.max(0, price - paid);
  }, 0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyRevenue = payments.filter((p) => p.date >= monthStart).reduce((s, p) => s + p.amount, 0);

  // 12-month sales trend
  const trend = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const sum = payments.filter((p) => p.date >= d && p.date < end).reduce((s, p) => s + p.amount, 0);
    trend.push({ label: d.toLocaleString("en-ZA", { month: "short" }), amount: sum });
  }

  return ok({
    stats: {
      totalPlots, available, reserved, sold, totalMembers,
      outstanding, monthlyRevenue,
      totalIncome: incomeAgg._sum.amount || 0,
      totalExpenses: expenseAgg._sum.amount || 0,
      newInquiries: inquiries,
      progressPercent: Math.round(((sold + reserved) / totalPlots) * 100),
    },
    trend,
    myTasks: tasks,
    recentActivity: recentAudit,
    notifications,
  });
}
