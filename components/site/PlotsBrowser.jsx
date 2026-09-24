"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StatusPill } from "@/components/ui";
import { zar } from "@/lib/format";

const PAGE_SIZE = 24;

export default function PlotsBrowser({ plots, standardPrice, promoEnds }) {
  const [status, setStatus] = useState("AVAILABLE");
  const [q, setQ] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [view, setView] = useState("grid");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let list = plots;
    if (status !== "ALL") list = list.filter((p) => p.status === status);
    if (q.trim()) list = list.filter((p) => p.number.includes(q.trim()));
    if (maxPrice) list = list.filter((p) => p.price <= Number(maxPrice));
    return list;
  }, [plots, status, q, maxPrice]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const pageItems = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const counts = useMemo(
    () => ({
      ALL: plots.length,
      AVAILABLE: plots.filter((p) => p.status === "AVAILABLE").length,
      RESERVED: plots.filter((p) => p.status === "RESERVED").length,
      SOLD: plots.filter((p) => p.status === "SOLD").length,
    }),
    [plots]
  );

  return (
    <div>
      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1" role="tablist" aria-label="Filter by status">
            {[["AVAILABLE", "Available"], ["RESERVED", "Reserved"], ["SOLD", "Sold"], ["ALL", "All"]].map(([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={status === key}
                onClick={() => { setStatus(key); setPage(1); }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${status === key ? "bg-white shadow text-forest-800" : "text-gray-600 hover:text-gray-900"}`}
              >
                {label} <span className="text-xs text-gray-400">({counts[key]})</span>
              </button>
            ))}
          </div>
          <input
            className="input max-w-40"
            placeholder="Search plot no."
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            aria-label="Search by plot number"
          />
          <select className="input max-w-44" value={maxPrice} onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }} aria-label="Maximum price">
            <option value="">Any price</option>
            <option value="75000">Up to R75,000</option>
            <option value="90000">Up to R90,000</option>
          </select>
          <div className="ml-auto flex gap-1 rounded-lg bg-gray-100 p-1">
            {[["grid", "▦ Grid"], ["list", "☰ List"]].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium cursor-pointer ${view === key ? "bg-white shadow text-forest-800" : "text-gray-600"}`}
                aria-pressed={view === key}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          All plots are 800m². Promotional price {zar(75000)} until {promoEnds} · standard price {zar(standardPrice)} thereafter (payment plans available).
        </p>
      </div>

      {/* Results */}
      {pageItems.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">No plots match your filters.</div>
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {pageItems.map((plot) => (
            <div key={plot.id} className="card p-4 flex flex-col">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-400">Block {plot.block}</p>
                  <h3 className="text-lg font-bold text-forest-900">Plot {plot.number}</h3>
                </div>
                <StatusPill status={plot.status} />
              </div>
              <p className="mt-2 text-sm text-gray-600">{plot.sizeSqm}m²</p>
              <p className="mt-1 text-xl font-extrabold text-sunset-500">{zar(plot.price)}</p>
              <Link href={`/plots/${plot.id}`} className="btn-outline btn-sm mt-3">View Details</Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr><th>Plot</th><th>Block</th><th>Size</th><th>Price</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {pageItems.map((plot) => (
                <tr key={plot.id}>
                  <td className="font-bold text-forest-900">Plot {plot.number}</td>
                  <td>{plot.block}</td>
                  <td>{plot.sizeSqm}m²</td>
                  <td className="font-semibold text-sunset-500">{zar(plot.price)}</td>
                  <td><StatusPill status={plot.status} /></td>
                  <td><Link href={`/plots/${plot.id}`} className="btn-outline btn-sm">View Details</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-2" aria-label="Pagination">
          <button className="btn-outline btn-sm" disabled={current === 1} onClick={() => setPage(current - 1)}>← Prev</button>
          <span className="text-sm text-gray-600 px-3">Page {current} of {pageCount}</span>
          <button className="btn-outline btn-sm" disabled={current === pageCount} onClick={() => setPage(current + 1)}>Next →</button>
        </nav>
      )}
    </div>
  );
}
