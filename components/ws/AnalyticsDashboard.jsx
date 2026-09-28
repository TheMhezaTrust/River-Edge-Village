"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/ws/common";
import { StatCard } from "@/components/ui";
import { dateTimeFmt } from "@/lib/format";

const VISITORS = "#2d6a4f";
const VIEWS = "#457b9d";

export default function AnalyticsDashboard({ data }) {
  const [range, setRange] = useState("month");
  const top = range === "month" ? data.topPagesThisMonth : data.topPagesThisYear;
  const topViews = top.reduce((sum, p) => sum + p.views, 0);
  const chartTop = top.slice(0, 8);
  const hasTraffic = data.daily.some((d) => d.views > 0);

  const periods = [
    ["Today", data.periods.today],
    ["This Week", data.periods.week],
    ["This Month", data.periods.month],
    ["This Year", data.periods.year],
    ["All Time", data.total],
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Traffic Analytics"
        subtitle="Public website traffic only — the workstation, member portal and administrator routes are never recorded."
        actions={<span className="text-xs text-gray-500">Updated {dateTimeFmt(data.generatedAt)}</span>}
      />

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        {periods.map(([label, p], i) => (
          <StatCard
            key={label}
            label={`${label} Visitors`}
            value={p.visitors}
            sub={`${p.views} page view${p.views === 1 ? "" : "s"}`}
            accent={i === 0 ? "forest" : i === 4 ? "amber" : "trust"}
          />
        ))}
      </div>

      <div className="card p-5">
        <h2 className="font-bold text-gray-900 mb-1">Last 30 Days</h2>
        <p className="text-xs text-gray-500 mb-4">
          Unique visitors (by hashed IP address) and total page views per day, South African time.
        </p>
        {!hasTraffic && (
          <p className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            No public page views have been recorded yet. Tracking starts as soon as visitors browse the website.
          </p>
        )}
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.daily} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="visitorsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={VISITORS} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={VISITORS} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={VIEWS} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={VIEWS} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={16} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="visitors" name="Visitors" stroke={VISITORS} strokeWidth={2} fill="url(#visitorsGrad)" />
              <Area type="monotone" dataKey="views" name="Page views" stroke={VIEWS} strokeWidth={2} fill="url(#viewsGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <h2 className="font-bold text-gray-900">Most Visited Pages</h2>
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            {[["month", "This month"], ["year", "This year"]].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setRange(key)}
                className={`rounded-md px-3 py-1 text-xs font-semibold cursor-pointer ${
                  range === key ? "bg-white text-forest-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-500 mb-4">Which public pages (tabs) are getting the most traffic.</p>

        {top.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">No page views recorded for this period yet.</p>
        ) : (
          <>
            <div style={{ height: Math.max(160, chartTop.length * 34) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartTop} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="views" name="Page views" fill={VISITORS} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr><th>Page</th><th>Path</th><th>Views</th><th>Visitors</th><th>Share of views</th></tr>
                </thead>
                <tbody>
                  {top.map((p) => (
                    <tr key={p.path}>
                      <td className="font-semibold text-forest-700 whitespace-nowrap">{p.label}</td>
                      <td className="text-xs text-gray-500 font-mono">{p.path}</td>
                      <td className="text-sm">{p.views}</td>
                      <td className="text-sm">{p.visitors}</td>
                      <td className="w-48">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${Math.round((p.views / (topViews || 1)) * 100)}%`, backgroundColor: VISITORS }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-10 text-right">
                            {Math.round((p.views / (topViews || 1)) * 100)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
