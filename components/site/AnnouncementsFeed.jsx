"use client";

import { useMemo, useState } from "react";
import { dateFmt } from "@/lib/format";

export default function AnnouncementsFeed({ announcements }) {
  const [category, setCategory] = useState("ALL");
  const categories = useMemo(() => ["ALL", ...new Set(announcements.map((a) => a.category).filter(Boolean))], [announcements]);
  const filtered = category === "ALL" ? announcements : announcements.filter((a) => a.category === category);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-5" role="tablist" aria-label="Filter announcements by category">
        {categories.map((c) => (
          <button
            key={c}
            role="tab"
            aria-selected={category === c}
            onClick={() => setCategory(c)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer ${category === c ? "bg-forest-700 text-white" : "bg-white border border-gray-300 text-gray-600 hover:border-forest-400"}`}
          >
            {c === "ALL" ? "All" : c.charAt(0) + c.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {filtered.length === 0 && <p className="text-gray-500 text-sm">No announcements in this category yet.</p>}
        {filtered.map((a) => (
          <article key={a.id} className="card p-5">
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span className="pill pill-in_progress">{a.category}</span>
              <time dateTime={a.createdAt}>{dateFmt(a.createdAt)} · {new Date(a.createdAt).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}</time>
            </div>
            <h3 className="mt-2 font-bold text-forest-900">{a.title}</h3>
            <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{a.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
