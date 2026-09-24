"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFetch, PageHeader, LoadingBlock, ErrorBlock } from "@/components/ws/common";
import { StatCard } from "@/components/ui";
import { zar, zarFull } from "@/lib/format";

const PIE_COLORS = ["#2d6a4f", "#52b788", "#f6c445", "#e05252", "#457b9d", "#7f5539", "#9d4edd"];

const monthLabel = (key) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-ZA", { month: "short", year: "2-digit" });
};

export default function ReportsPage() {
  const { data, loading, error } = useFetch("/api/reports/summary");

  const sales = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.salesByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, amount]) => ({ key, label: monthLabel(key), amount }));
  }, [data]);

  if (loading && !data) return <LoadingBlock label="Compiling reports…" />;
  if (error) return <ErrorBlock message={error} />;

  const { inquiryStats, memberStats, expenseByCategory, totals } = data;
  const totalPlots = totals.plotsSold + totals.plotsReserved + totals.plotsAvailable;  const expenseData = Object.entries(expenseByCategory).map(([name, value]) => ({ name: name.replaceAll("_", " "), value }));
  const memberData = [
    { name: "Paid up", value: memberStats.paid },
    { name: "Partially paid", value: memberStats.partial },
    { name: "Outstanding", value: memberStats.outstanding },
  ].filter((d) => d.value > 0);

  function exportCsv() {
    const headers = ["Metric", "Value"];
    const rows = [
      ["Total Income", totals.income],
      ["Total Expenses", totals.expenses],
      ["Payments Collected", totals.collected],
      ["Plots Sold", totals.plotsSold],
      ["Plots Reserved", totals.plotsReserved],
      ["Plots Available", totals.plotsAvailable],
      ["Inquiries — Total", inquiryStats.total],
      ["Inquiries — New", inquiryStats.new],
      ["Inquiries — Contacted", inquiryStats.contacted],
      ["Inquiries — Converted", inquiryStats.converted],
      ["Inquiries — Closed", inquiryStats.closed],
      ["Inquiry Conversion Rate %", inquiryStats.conversionRate],
      ["Members — Paid", memberStats.paid],
      ["Members — Partial", memberStats.partial],
      ["Members — Outstanding", memberStats.outstanding],
      ...sales.map((s) => [`Sales ${s.key}`, s.amount]),
      ...Object.entries(expenseByCategory).map(([c, v]) => [`Expense ${c}`, v]),
    ];
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `mheza-report-summary-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reporting"
        subtitle="Trust-wide performance: sales, inquiries, member payments and expenses"
        actions={<button className="btn-outline btn-sm" onClick={exportCsv}>Export summary CSV</button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Income" value={zar(totals.income)} accent="forest" sub="All recorded income" />
        <StatCard label="Total Expenses" value={zar(totals.expenses)} accent="red" sub="All recorded expenses" />
        <StatCard label="Collected" value={zar(totals.collected)} accent="trust" sub="Member plot payments" />
        <StatCard label="Plots Sold" value={totals.plotsSold} accent="sunset" sub={`of ${totalPlots} plots`} />
        <StatCard label="Plots Reserved" value={totals.plotsReserved} accent="amber" sub={`of ${totalPlots} plots`} />
        <StatCard label="Plots Available" value={totals.plotsAvailable} accent="forest" sub={`of ${totalPlots} plots`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-bold text-gray-900 mb-4">Sales by Month</h2>
          {sales.length === 0 ? (
            <p className="text-sm text-gray-500 py-10 text-center">No payments recorded yet.</p>
          ) : (
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={sales} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => `R${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v) => zarFull(v)} />
                  <Bar dataKey="amount" name="Sales" fill="#2d6a4f" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="font-bold text-gray-900 mb-4">Inquiry Funnel</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label="Total Inquiries" value={inquiryStats.total} sub="All time" />
            <StatCard label="New" value={inquiryStats.new} accent="trust" sub="Awaiting contact" />
            <StatCard label="Contacted" value={inquiryStats.contacted} accent="amber" sub="Engagement started" />
            <StatCard label="Converted" value={inquiryStats.converted} accent="forest" sub="Became members" />
            <StatCard label="Closed" value={inquiryStats.closed} accent="red" sub="Not proceeding" />
            <StatCard label="Conversion Rate" value={`${inquiryStats.conversionRate}%`} accent="sunset" sub="Converted ÷ total" />
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-bold text-gray-900 mb-4">Member Payment Status</h2>
          {memberData.length === 0 ? (
            <p className="text-sm text-gray-500 py-10 text-center">No members yet.</p>
          ) : (
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={memberData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {memberData.map((entry, i) => <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="font-bold text-gray-900 mb-4">Expenses by Category</h2>
          {expenseData.length === 0 ? (
            <p className="text-sm text-gray-500 py-10 text-center">No expenses recorded yet.</p>
          ) : (
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={expenseData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {expenseData.map((entry, i) => <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => zarFull(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
