"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { useFetch, PageHeader, LoadingBlock, ErrorBlock } from "@/components/ws/common";
import { usePermissions, ReadOnlyNote } from "@/components/ws/permissions";
import { Modal, Field, StatusPill, Alert, EmptyState } from "@/components/ui";
import PlotMap from "@/components/PlotMap";
import { uncertainReadings } from "@/lib/plan-layout";
import { zar, zarFull, dateTimeFmt } from "@/lib/format";

const EMPTY_PLOT = { number: "", sizeSqm: "800", price: "", status: "AVAILABLE", block: "", description: "" };
const STATUSES = ["AVAILABLE", "RESERVED", "SOLD"];
const UNCERTAIN = uncertainReadings().sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

export default function PlotsPage() {
  const { can } = usePermissions();
  const canManage = can("plots:manage");

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [blockFilter, setBlockFilter] = useState("ALL");
  const [q, setQ] = useState("");

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    if (statusFilter !== "ALL") sp.set("status", statusFilter);
    if (blockFilter !== "ALL") sp.set("block", blockFilter);
    if (q.trim()) sp.set("q", q.trim());
    const s = sp.toString();
    return `/api/plots${s ? `?${s}` : ""}`;
  }, [statusFilter, blockFilter, q]);

  const { data: plots, loading, error, reload } = useFetch(query);
  const { data: allPlots } = useFetch("/api/plots");

  const [view, setView] = useState("MAP");
  const [selected, setSelected] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_PLOT);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [checked, setChecked] = useState([]);
  const [bulkBusy, setBulkBusy] = useState(false);

  const blocks = useMemo(() => {
    const set = new Set((allPlots || []).map((p) => p.block).filter(Boolean));
    return [...set].sort();
  }, [allPlots]);

  const list = plots || [];

  function toggleCheck(id) {
    setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  }

  async function changeStatus(plot, status) {
    setSaving(true);
    setFormError(null);
    try {
      await api.put(`/api/plots/${plot.id}`, { status });
      setSelected(null);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function openEdit(plot) {
    setEditId(plot.id);
    setEditForm({
      number: plot.number || "",
      sizeSqm: plot.sizeSqm ?? "",
      price: plot.price ?? "",
      status: plot.status || "AVAILABLE",
      block: plot.block || "",
      description: plot.description || "",
    });
    setFormError(null);
    setEditOpen(true);
  }

  async function saveEdit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.put(`/api/plots/${editId}`, editForm);
      setEditOpen(false);
      setSelected(null);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function submitAdd(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.post("/api/plots", addForm);
      setAddOpen(false);
      setAddForm(EMPTY_PLOT);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function bulkUpdate(patch) {
    setBulkBusy(true);
    try {
      await api.put("/api/plots/bulk", { ids: checked, ...patch });
      setChecked([]);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBulkBusy(false);
    }
  }

  if (loading && !plots) return <LoadingBlock label="Loading plots…" />;
  if (error) return <ErrorBlock message={error} />;

  const counts = STATUSES.map((s) => [s, list.filter((p) => p.status === s).length]);

  return (
    <div>
      <PageHeader
        title="Plot Management"
        subtitle={`${list.length} plots shown · River Edge Rural Village · 800m² each · erf numbers per the official survey layout plan`}
        actions={
          <>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              {[["MAP", "Map"], ["GRID", "Grid"], ["TABLE", "Table"]].map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setView(k)}
                  className={`px-3 py-1.5 text-sm font-medium cursor-pointer ${view === k ? "bg-forest-700 text-white" : "bg-white text-gray-600 hover:bg-forest-50"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {canManage && <button className="btn-primary btn-sm" onClick={() => { setFormError(null); setAddOpen(true); }}>+ Add Plot</button>}
          </>
        }
      />

      {formError && !editOpen && !addOpen && <div className="mb-4"><Alert type="error" onClose={() => setFormError(null)}>{formError}</Alert></div>}
      {!canManage && <div className="mb-4"><ReadOnlyNote label="all plot records" /></div>}

      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <strong>Verify against the surveyor&apos;s schedule:</strong> {UNCERTAIN.length} erf numbers were read from the handwritten layout plan and may be misread —{" "}
        <span className="font-mono">{UNCERTAIN.join(", ")}</span>. Correct any of them with Edit; the map position is independent of the number.
      </div>

      <div className="card p-4 mb-4 flex flex-wrap gap-3 items-center">
        <input className="input max-w-48" placeholder="Search plot number…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search plots by number" />
        <select className="input max-w-52" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
          <option value="ALL">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
        </select>
        <select className="input max-w-52" value={blockFilter} onChange={(e) => setBlockFilter(e.target.value)} aria-label="Filter by block">
          <option value="ALL">All blocks</option>
          {blocks.map((b) => <option key={b} value={b}>Block {b}</option>)}
        </select>
        <div className="ml-auto flex gap-3 text-sm">
          {counts.map(([s, n]) => (
            <span key={s} className="flex items-center gap-1.5 text-gray-600">
              <StatusPill status={s} /> <strong>{n}</strong>
            </span>
          ))}
        </div>
      </div>

      {view === "MAP" && (
        <div className="card p-4">
          <PlotMap plots={list} selectedId={selected?.id} onSelectPlot={(p) => { setSelected(p); setFormError(null); }} height={600} />
        </div>
      )}

      {view === "GRID" && (
        list.length === 0 ? (
          <div className="card"><EmptyState title="No plots match" message="Adjust the filters above." /></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {list.map((p) => (
              <button
                key={p.id}
                onClick={() => { setSelected(p); setFormError(null); }}
                className={`card p-3 text-left hover:shadow-md transition-shadow cursor-pointer border-2 ${
                  p.status === "AVAILABLE" ? "border-forest-200" : p.status === "RESERVED" ? "border-amber-300" : "border-red-300"
                }`}
              >
                <p className="font-bold text-gray-900">Plot {p.number}</p>
                <p className="text-xs text-gray-500">Block {p.block || "-"} · {p.sizeSqm}m²</p>
                <p className="text-xs font-semibold text-forest-700 mt-1">{zar(p.price)}</p>
                <div className="mt-1.5"><StatusPill status={p.status} /></div>
              </button>
            ))}
          </div>
        )
      )}

      {view === "TABLE" && (
        <div className="card overflow-x-auto">
          {canManage && checked.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-200 bg-forest-50">
              <span className="text-sm font-semibold text-forest-800">{checked.length} selected</span>
              <button className="btn-outline btn-sm" disabled={bulkBusy} onClick={() => bulkUpdate({ status: "AVAILABLE" })}>Mark Available</button>
              <button className="btn-outline btn-sm" disabled={bulkBusy} onClick={() => bulkUpdate({ status: "RESERVED" })}>Mark Reserved</button>
              <button className="btn-outline btn-sm" disabled={bulkBusy} onClick={() => bulkUpdate({ status: "SOLD" })}>Mark Sold</button>
              <input
                className="input max-w-40 btn-sm py-1"
                type="number"
                min="0"
                placeholder="New price…"
                aria-label="Bulk price"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.target.value) { e.preventDefault(); bulkUpdate({ price: Number(e.target.value) }); e.target.value = ""; }
                }}
              />
              <button className="btn-ghost btn-sm ml-auto" disabled={bulkBusy} onClick={() => setChecked([])}>Clear</button>
            </div>
          )}
          <table className="table-base">
            <thead>
              <tr>
                {canManage && (
                  <th className="w-8">
                    <input
                      type="checkbox"
                      aria-label="Select all plots"
                      checked={list.length > 0 && checked.length === list.length}
                      onChange={(e) => setChecked(e.target.checked ? list.map((p) => p.id) : [])}
                    />
                  </th>
                )}
                <th>Plot</th><th>Block</th><th>Size</th><th>Price</th><th>Status</th><th>Member</th><th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  {canManage && (
                    <td>
                      <input type="checkbox" aria-label={`Select plot ${p.number}`} checked={checked.includes(p.id)} onChange={() => toggleCheck(p.id)} />
                    </td>
                  )}
                  <td><button className="font-semibold text-forest-700 hover:underline cursor-pointer" onClick={() => { setSelected(p); setFormError(null); }}>{p.number}</button></td>
                  <td>{p.block || "-"}</td>
                  <td>{p.sizeSqm}m²</td>
                  <td className="whitespace-nowrap">{zar(p.price)}</td>
                  <td><StatusPill status={p.status} /></td>
                  <td className="text-xs text-gray-600">
                    {p.member ? <Link href={`/workstation/members/${p.member.id}`} className="text-forest-700 hover:underline">{p.member.fullName}</Link> : "-"}
                  </td>
                  <td className="whitespace-nowrap">
                    <button className="btn-ghost btn-sm" onClick={() => { setSelected(p); setFormError(null); }}>View</button>
                    {canManage && <button className="btn-ghost btn-sm" onClick={() => openEdit(p)}>Edit</button>}
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={canManage ? 8 : 7} className="text-center text-gray-500 py-10">No plots match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Plot details modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `Plot ${selected.number}` : ""}>
        {selected && (
          <div className="space-y-4">
            {formError && <Alert type="error" onClose={() => setFormError(null)}>{formError}</Alert>}
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Block</dt><dd className="font-medium">{selected.block || "-"}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Size</dt><dd className="font-medium">{selected.sizeSqm}m²</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Price</dt><dd className="font-medium">{zarFull(selected.price)}</dd></div>
              <div className="flex justify-between items-center"><dt className="text-gray-500">Status</dt><dd><StatusPill status={selected.status} /></dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Updated</dt><dd className="font-medium">{dateTimeFmt(selected.updatedAt)}</dd></div>
              {selected.member && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Member</dt>
                  <dd><Link href={`/workstation/members/${selected.member.id}`} className="font-semibold text-forest-700 hover:underline">{selected.member.fullName}</Link></dd>
                </div>
              )}
            </dl>
            {selected.description && <p className="text-sm text-gray-600 rounded-lg bg-gray-50 p-3">{selected.description}</p>}
            {canManage && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                {STATUSES.filter((s) => s !== selected.status).map((s) => (
                  <button key={s} className="btn-outline btn-sm" disabled={saving} onClick={() => changeStatus(selected, s)}>
                    Mark {s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
                <button className="btn-primary btn-sm ml-auto" disabled={saving} onClick={() => openEdit(selected)}>Edit Plot</button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit plot modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={editForm ? `Edit Plot ${editForm.number}` : "Edit Plot"}>
        {editForm && (
          <form onSubmit={saveEdit} className="grid gap-4 sm:grid-cols-2">
            {formError && <div className="sm:col-span-2"><Alert type="error">{formError}</Alert></div>}
            <Field label="Plot Number" required><input className="input" required value={editForm.number} onChange={(e) => setEditForm((f) => ({ ...f, number: e.target.value }))} /></Field>
            <Field label="Block"><input className="input" value={editForm.block} onChange={(e) => setEditForm((f) => ({ ...f, block: e.target.value }))} placeholder="A" /></Field>
            <Field label="Size (m²)"><input className="input" type="number" min="1" value={editForm.sizeSqm} onChange={(e) => setEditForm((f) => ({ ...f, sizeSqm: e.target.value }))} /></Field>
            <Field label="Price (R)" required><input className="input" type="number" min="0" required value={editForm.price} onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))} /></Field>
            <Field label="Status">
              <select className="input" value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}>
                {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
              </select>
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <textarea className="input" rows={2} value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
            </Field>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setEditOpen(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save Changes"}</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Add plot modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add New Plot">
        {formError && <div className="mb-4"><Alert type="error">{formError}</Alert></div>}
        <form onSubmit={submitAdd} className="grid gap-4 sm:grid-cols-2">
          <Field label="Plot Number" required><input className="input" required value={addForm.number} onChange={(e) => setAddForm((f) => ({ ...f, number: e.target.value }))} /></Field>
          <Field label="Block"><input className="input" value={addForm.block} onChange={(e) => setAddForm((f) => ({ ...f, block: e.target.value }))} placeholder="A" /></Field>
          <Field label="Size (m²)"><input className="input" type="number" min="1" value={addForm.sizeSqm} onChange={(e) => setAddForm((f) => ({ ...f, sizeSqm: e.target.value }))} /></Field>
          <Field label="Price (R)" required><input className="input" type="number" min="0" required value={addForm.price} onChange={(e) => setAddForm((f) => ({ ...f, price: e.target.value }))} /></Field>
          <Field label="Status">
            <select className="input" value={addForm.status} onChange={(e) => setAddForm((f) => ({ ...f, status: e.target.value }))}>
              {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
            </select>
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <textarea className="input" rows={2} value={addForm.description} onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))} />
          </Field>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setAddOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Add Plot"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
