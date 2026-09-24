"use client";

import { useCallback, useRef, useState } from "react";
import { PLAN_W, PLAN_H, PLAN_CELL_W, PLAN_CELL_H, BLOCK_LABELS, PLAN_DECOR } from "@/lib/plan-layout";

const COLORS = {
  AVAILABLE: "#52b788",
  RESERVED: "#f6c445",
  SOLD: "#e05252",
};

export default function PlotMap({ plots, onSelectPlot, selectedId, height = 560 }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(null);
  const dragStart = useRef(null);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    setZoom((z) => Math.min(4, Math.max(0.6, z * (e.deltaY < 0 ? 1.12 : 0.89))));
  }, []);

  const onPointerDown = useCallback((e) => {
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y, moved: false };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [pan]);

  const onPointerMove = useCallback((e) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x - pan.x;
    const dy = e.clientY - dragStart.current.y - pan.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) dragStart.current.moved = true;
    setPan({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  }, [pan]);

  const onPointerUp = useCallback(() => {
    setDragging(false);
    dragStart.current = null;
  }, []);

  return (
    <div className="relative">
      {/* Controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
        {[["+", () => setZoom((z) => Math.min(4, z * 1.25))], ["−", () => setZoom((z) => Math.max(0.6, z * 0.8))], ["⟲", () => { setZoom(1); setPan({ x: 0, y: 0 }); }]].map(([label, fn]) => (
          <button key={label} onClick={fn} className="w-9 h-9 bg-white border border-gray-300 rounded-lg shadow text-lg font-bold text-forest-800 hover:bg-forest-50 cursor-pointer" aria-label={`Zoom ${label}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="absolute top-3 left-3 z-10 bg-white/95 border border-gray-200 rounded-lg shadow p-3 text-xs space-y-1.5">
        {[["AVAILABLE", "Available"], ["RESERVED", "Reserved"], ["SOLD", "Sold"]].map(([k, label]) => (
          <div key={k} className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-sm inline-block" style={{ background: COLORS[k] }} />
            <span className="text-gray-700 font-medium">{label}</span>
            <span className="text-gray-400 ml-auto pl-2">{plots.filter((p) => p.status === k).length}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
          <span className="w-3.5 h-3.5 rounded-full inline-block bg-trust-400/60" />
          <span className="text-gray-700 font-medium">Dam</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-sm inline-block bg-forest-200" />
          <span className="text-gray-700 font-medium">Green space</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-sm inline-block" style={{ background: "#8d5a44" }} />
          <span className="text-gray-700 font-medium">Wetland buffer</span>
        </div>
      </div>

      {/* Hover tooltip */}
      {hovered && (
        <div className="absolute bottom-3 left-3 z-10 bg-forest-900/95 text-white text-xs rounded-lg px-3 py-2 pointer-events-none">
          <span className="font-bold">Erf {hovered.number}</span> · Block {hovered.block} · {hovered.sizeSqm}m² ·{" "}
          <span style={{ color: COLORS[hovered.status] }}>{hovered.status.toLowerCase()}</span>
        </div>
      )}

      <div
        className="overflow-hidden rounded-xl border border-gray-200 bg-earth-50 select-none"
        style={{ height, cursor: dragging ? "grabbing" : "grab", touchAction: "none" }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        role="img"
        aria-label={`Interactive layout map of River Edge Rural Village with ${plots.length} erven`}
      >
        <svg width="100%" height="100%" viewBox={`0 0 ${PLAN_W} ${PLAN_H}`} preserveAspectRatio="xMidYMid meet">
          <g transform={`translate(${PLAN_W / 2 + pan.x}, ${PLAN_H / 2 + pan.y}) scale(${zoom}) translate(${-PLAN_W / 2}, ${-PLAN_H / 2})`}>
            {/* Farm boundary */}
            <rect x="16" y="24" width={PLAN_W - 32} height={PLAN_H - 40} rx="14" fill="#f3ecdf" stroke="#c8a27a" strokeWidth="2.5" strokeDasharray="10 5" />
            <text x="20" y="16" fontSize="13" fontWeight="700" fill="#654321">
              RIVER EDGE RURAL VILLAGE · PORTION 2 OF FARM 970 · 31.9 ha
            </text>
            <text x={PLAN_W - 20} y="16" textAnchor="end" fontSize="11" fill="#654321">
              North boundary 311.88m · 89.22m · 237.06m
            </text>

            {/* Wetland buffers (drawn under the dams) */}
            {PLAN_DECOR.buffers.map((b, i) => (
              <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx="18" fill="#8d5a44" opacity="0.35" />
            ))}

            {/* Green belts */}
            {PLAN_DECOR.green.map((g, i) => (
              <g key={i}>
                <rect x={g.x} y={g.y} width={g.w} height={g.h} rx="10" fill="#d8f3dc" />
                <text x={g.x + g.w / 2} y={g.y + g.h / 2} fontSize="9" fill="#2d6a4f" fontWeight="600" textAnchor="middle">
                  {g.label}
                </text>
              </g>
            ))}

            {/* Dams */}
            {PLAN_DECOR.dams.map((d, i) => (
              <g key={i}>
                <ellipse cx={d.cx} cy={d.cy} rx={d.rx} ry={d.ry} fill="#a8c6da" stroke="#457b9d" strokeWidth="2" />
                <ellipse cx={d.cx} cy={d.cy} rx={d.rx * 0.72} ry={d.ry * 0.72} fill="#bcd7e8" />
                <text x={d.cx} y={d.cy + 4} textAnchor="middle" fontSize="10" fontWeight="600" fill="#1d3557">{d.label}</text>
              </g>
            ))}
            <text x={PLAN_W / 2} y={PLAN_H - 26} textAnchor="middle" fontSize="9" fill="#5c3a2e" fontWeight="600">
              WETLAND BUFFER · SETBACK COMPLIANT
            </text>

            {/* Boundary dimensions from the official survey plan */}
            <text x={PLAN_W - 8} y={PLAN_H / 2} fontSize="10" fill="#654321" transform={`rotate(90 ${PLAN_W - 8} ${PLAN_H / 2})`} textAnchor="middle">360.92m</text>
            <text x={PLAN_W / 2} y={PLAN_H - 4} textAnchor="middle" fontSize="10" fill="#654321">501.03m</text>

            {/* Block zone labels */}
            {BLOCK_LABELS.map((b, i) => (
              <text key={i} x={b.x} y={b.y} fontSize="12" fontWeight="800" fill="#7f5539" letterSpacing="0.5">
                {b.label}
              </text>
            ))}

            {/* Erven */}
            {plots.map((plot) => {
              const x = plot.x - PLAN_CELL_W / 2;
              const y = plot.y - PLAN_CELL_H / 2;
              const isSelected = selectedId === plot.id;
              return (
                <g key={plot.id}>
                  <rect
                    x={x}
                    y={y}
                    width={PLAN_CELL_W}
                    height={PLAN_CELL_H}
                    rx="3"
                    fill={COLORS[plot.status] || "#ccc"}
                    stroke={isSelected ? "#1b4332" : "#ffffff"}
                    strokeWidth={isSelected ? 3 : 1}
                    className="cursor-pointer transition-opacity hover:opacity-80"
                    onClick={() => {
                      if (dragStart.current?.moved) return;
                      onSelectPlot?.(plot);
                    }}
                    onMouseEnter={() => setHovered(plot)}
                    onMouseLeave={() => setHovered(null)}
                    role="button"
                    aria-label={`Erf ${plot.number}, ${plot.status.toLowerCase()}`}
                  />
                  <text x={plot.x} y={plot.y + 3.5} textAnchor="middle" fontSize={plot.number.length > 3 ? 7.5 : 9.5} fontWeight="600" fill="#143d26" pointerEvents="none">
                    {plot.number}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
      <p className="text-xs text-gray-500 mt-2 text-center">
        Erf numbering follows the official survey layout plan. Scroll to zoom · drag to pan · click an erf for details. Roads: 6m minimum secondary, 9–11m primary reserves.
      </p>
    </div>
  );
}
