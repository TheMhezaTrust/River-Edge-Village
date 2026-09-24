"use client";

import { useState } from "react";
import PlotMap from "@/components/PlotMap";
import { Modal, StatusPill } from "@/components/ui";
import { zar } from "@/lib/format";
import InterestForm from "@/components/InterestForm";

export default function PlotMapSection({ plots, standardPrice }) {
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("PLAN");

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button className={view === "PLAN" ? "btn-primary btn-sm" : "btn-outline btn-sm"} onClick={() => setView("PLAN")}>
          Official Site Plan
        </button>
        <button className={view === "MAP" ? "btn-primary btn-sm" : "btn-outline btn-sm"} onClick={() => setView("MAP")}>
          Interactive Plot Status Map
        </button>
        <span className="text-xs text-gray-500 ml-auto">
          {view === "PLAN" ? "Surveyor layout: numbered plots, roads, dams and wetland buffers." : "Schematic block view coloured by sales status — click a plot for details."}
        </span>
      </div>
      {view === "PLAN" ? <SitePlanViewer /> : <PlotMap plots={plots} onSelectPlot={setSelected} selectedId={selected?.id} />}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `Plot ${selected.number} · Block ${selected.block}` : ""} wide>
        {selected && (
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <StatusPill status={selected.status} />
                <span className="text-sm text-gray-500">{selected.sizeSqm}m² residential plot</span>
              </div>
              <div className="rounded-xl bg-earth-50 p-4 mb-4">
                <p className="text-3xl font-extrabold text-sunset-500">{zar(selected.price)}</p>
                <p className="text-sm text-gray-600">Promotional price until 30 Nov 2026</p>
                <p className="text-sm text-gray-500 line-through">Standard price {zar(standardPrice)} thereafter</p>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{selected.description}</p>
              <ul className="mt-4 space-y-1.5 text-sm text-gray-600">
                <li className="flex gap-2"><span aria-hidden>💧</span> Rainwater harvesting ready</li>
                <li className="flex gap-2"><span aria-hidden>🚽</span> Septic tank & French drain approved (no-objection)</li>
                <li className="flex gap-2"><span aria-hidden>⚡</span> Eskom electricity connection at farm boundary</li>
                <li className="flex gap-2"><span aria-hidden>🛣️</span> 6m minimum roads; 9–11m primary roads</li>
              </ul>
              <div className="mt-4 rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800">
                360° panoramic photos of this plot will appear here once the media team has captured them.
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 p-5 bg-gray-50/50">
              <h3 className="font-bold text-forest-900 mb-4">
                {selected.status === "AVAILABLE" ? "Buy This Plot / Express Interest" : selected.status === "RESERVED" ? "Join the Waiting List" : "This Plot Is Sold"}
              </h3>
              {selected.status === "SOLD" ? (
                <div className="text-sm text-gray-600">
                  <p>Plot {selected.number} has been sold. Browse the map for available plots nearby, or register your interest and a consultant will help you find a similar plot.</p>
                  <div className="mt-4">
                    <InterestForm plot={selected} kind="REGISTER" compact />
                  </div>
                </div>
              ) : (
                <InterestForm plot={selected} kind="INTEREST" compact />
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function SitePlanViewer() {
  const [scale, setScale] = useState(1);
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <p className="text-sm text-gray-600">
          Official layout plan · boundaries 311.88m + 89.22m + 237.06m (north), 360.92m (east), 501.03m (south) · dams in blue, wetland buffers in brown.
        </p>
        <div className="flex gap-2">
          <button className="btn-outline btn-sm" onClick={() => setScale((s) => Math.max(1, s - 0.5))} aria-label="Zoom out">−</button>
          <span className="btn-ghost btn-sm pointer-events-none">{Math.round(scale * 100)}%</span>
          <button className="btn-outline btn-sm" onClick={() => setScale((s) => Math.min(4, s + 0.5))} aria-label="Zoom in">+</button>
        </div>
      </div>
      <div className="overflow-auto max-h-[560px] rounded-lg border border-gray-200 bg-gray-100">
        <img
          src="/images/site-plan.jpg"
          alt="Official River Edge Rural Village layout plan showing numbered plots, road reserves, two dams and wetland buffers"
          style={{ width: `${scale * 100}%` }}
          className="min-w-full block"
        />
      </div>
    </div>
  );
}
