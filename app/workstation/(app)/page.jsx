"use client";

import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useFetch, PageHeader, LoadingBlock, ErrorBlock } from "@/components/ws/common";
import { usePermissions } from "@/components/ws/permissions";
import { StatCard, StatusPill } from "@/components/ui";
import { zar, dateTimeFmt, dateFmt } from "@/lib/format";

const QUICK_ACTIONS = [
  ["/workstation/members?new=1", "➕", "Add Member", "members:manage"],
  ["/workstation/finance?tab=payments", "💵", "Record Payment", "finance:manage"],
  ["/workstation/inquiries?new=1", "📝", "Add Inquiry", "inquiries:manage"],
  ["/workstation/plots", "🗺️", "Update Plots", "plots:manage"],
  ["/workstation/communication", "✉️", "Send Message", null],
  ["/workstation/reports", "📈", "Generate Report", null],
];

export default function WorkstationDashboard() {
  const { can } = usePermissions();
  const { data, error, loading } = useFetch("/api/dashboard/stats");

  if (loading) return <LoadingBlock label="Loading dashboard…" />;
  if (error) return <ErrorBlock message={error} />;

  const { stats, trend, myTasks, recentActivity, notifications } = data;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Overview of plots, members, finances and activity across The Mheza Trust." />

      {/* Quick stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 xl:grid-cols-8">
        <StatCard label="Total Plots" value={stats.totalPlots} />
        <StatCard label="Available" value={stats.available} accent="forest" />
        <StatCard label="Reserved" value={stats.reserved} accent="amber" />
        <StatCard label="Sold" value={stats.sold} accent="red" />
        <StatCard label="Members" value={stats.totalMembers} accent="trust" />
        <StatCard label="Outstanding" value={zar(stats.outstanding)} sub="Member balances" accent="amber" />
        <StatCard label="Monthly Revenue" value={zar(stats.monthlyRevenue)} accent="forest" />
        <StatCard label="Sales Progress" value={`${stats.progressPercent}%`} sub="Sold + reserved" accent="trust" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sales trend */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="font-bold text-gray-900 mb-1">Sales Trend</h2>
          <p className="text-xs text-gray-500 mb-4">Payments collected per month (last 12 months)</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 5, right: 5, bottom: 0, left: 5 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2d6a4f" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2d6a4f" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => zar(v)} />
                <Area type="monotone" dataKey="amount" stroke="#2d6a4f" strokeWidth={2} fill="url(#salesGrad)" name="Collected" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick actions */}
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.filter(([, , , perm]) => !perm || can(perm)).map(([href, icon, label]) => (
              <Link key={label} href={href} className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-200 p-4 text-sm font-medium text-gray-700 hover:border-forest-400 hover:bg-forest-50 transition-colors">
                <span className="text-2xl" aria-hidden>{icon}</span>
                {label}
              </Link>
            ))}
          </div>

          <h2 className="font-bold text-gray-900 mt-6 mb-3">Notifications</h2>
          <ul className="space-y-2">
            {notifications.length === 0 && <li className="text-sm text-gray-500">Nothing new.</li>}
            {notifications.map((n) => (
              <li key={n.id} className="rounded-lg bg-forest-50 border border-forest-100 px-3 py-2 text-xs text-gray-700">
                {n.text}
                <span className="block text-gray-400 mt-0.5">{dateTimeFmt(n.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* My tasks */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">My Tasks</h2>
            <Link href="/workstation/tasks" className="text-xs text-forest-700 font-semibold hover:underline">View all →</Link>
          </div>
          {myTasks.length === 0 ? (
            <p className="text-sm text-gray-500">No open tasks assigned to you. 🎉</p>
          ) : (
            <ul className="space-y-3">
              {myTasks.map((t) => (
                <li key={t.id} className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t.title}</p>
                    {t.dueDate && <p className="text-xs text-gray-500 mt-0.5">Due {dateFmt(t.dueDate)}</p>}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <StatusPill status={t.priority} />
                    <StatusPill status={t.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent activity */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Recent Activity</h2>
            <Link href="/workstation/settings?tab=audit" className="text-xs text-forest-700 font-semibold hover:underline">Audit log →</Link>
          </div>
          <ul className="space-y-3">
            {recentActivity.map((a) => (
              <li key={a.id} className="flex items-start gap-3 text-sm">
                <span className="mt-1 h-2 w-2 rounded-full bg-forest-400 shrink-0" aria-hidden />
                <div>
                  <p className="text-gray-800">
                    <strong>{a.user?.name || "System"}</strong>{" "}
                    <span className="text-gray-600">{a.action.replaceAll("_", " ").toLowerCase()}</span>
                    {a.entity && <span className="text-gray-400"> · {a.entity}{a.entityId ? ` #${a.entityId}` : ""}</span>}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{dateTimeFmt(a.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Financial snapshot */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total Income (all time)" value={zar(stats.totalIncome)} accent="forest" />
        <StatCard label="Total Expenses (all time)" value={zar(stats.totalExpenses)} accent="red" />
        <StatCard label="New Inquiries" value={stats.newInquiries} sub="Awaiting first contact" accent="trust" />
      </div>
    </div>
  );
}
