"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api-client";
import { useFetch, LoadingBlock, ErrorBlock, ConfirmButton } from "@/components/ws/common";
import { usePermissions, ReadOnlyNote } from "@/components/ws/permissions";
import { Modal, Field, Alert } from "@/components/ui";
import { zarFull } from "@/lib/format";

// The budget "jars": every incoming payment is split across these by percentage, and
// every expense draws one down. Editing is held behind finance:admin, so ordinary
// administrators see the balances read-only.
export default function BudgetTab() {
  const { can } = usePermissions();
  const canEdit = can("finance:admin");
  const { data, loading, error, reload } = useFetch("/api/finance/budget-categories");
  const [notice, setNotice] = useState(null);

  const [pctDraft, setPctDraft] = useState({});
  const [addOpen, setAddOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const categories = data?.categories || [];
  const total = data?.activePercentageTotal ?? 0;

  // Reset the percentage draft whenever the server data changes.
  useEffect(() => {
    const draft = {};
    for (const c of categories) if (c.isActive) draft[c.id] = String(c.percentage);
    setPctDraft(draft);
  }, [data]);

  const draftTotal = useMemo(
    () => Math.round(Object.values(pctDraft).reduce((s, v) => s + (Number(v) || 0), 0) * 100) / 100,
    [pctDraft],
  );
  const totalAllocated = categories.reduce((s, c) => s + c.allocated, 0);

  if (loading && !data) return <LoadingBlock label="Loading budget…" />;
  if (error) return <ErrorBlock message={error} />;

  async function savePercentages() {
    setBusy(true);
    setNotice(null);
    try {
      await api.put("/api/finance/budget-categories/percentages", {
        percentages: Object.entries(pctDraft).map(([id, percentage]) => ({ id: Number(id), percentage: Number(percentage) })),
      });
      setNotice({ type: "success", text: "Allocation percentages saved. They apply to payments recorded from now on." });
      reload();
    } catch (e) {
      setNotice({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  }

  async function removeCategory(c) {
    setBusy(true);
    setNotice(null);
    try {
      const res = await api.del(`/api/finance/budget-categories/${c.id}`);
      setNotice({
        type: "success",
        text: res.deleted ? `Deleted "${c.name}".` : `"${c.name}" was archived — it has transaction history an auditor must still see, so it is deactivated rather than erased.`,
      });
      reload();
    } catch (e) {
      setNotice({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {!canEdit && <ReadOnlyNote label="budget categories" />}

      {notice && <Alert type={notice.type}>{notice.text}</Alert>}

      {categories.some((c) => c.isSystem === false && c.percentage > 0) === false && totalAllocated === 0 && (
        <Alert type="warning">
          The default percentages below are placeholders, not the Trust&rsquo;s allocation policy. A Finance Admin should
          set the real split before relying on these balances. Jars fill from payments recorded after go-live; income
          recorded before the ledger existed is in the books but not split into jars.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <JarCard key={c.id} c={c} canEdit={canEdit} onRename={() => setRenameTarget(c)} onDelete={() => removeCategory(c)} busy={busy} />
        ))}
      </div>

      {canEdit && (
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="font-bold text-gray-900">Allocation percentages</h3>
            <div className="flex gap-2">
              <button className="btn-outline btn-sm" onClick={() => setAddOpen(true)}>+ Add category</button>
              <button className="btn-outline btn-sm" onClick={() => setTransferOpen(true)}>Transfer funds</button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Must total exactly 100%. Changes apply only to payments recorded from now on — past allocations keep the
            percentage that was in force when the money arrived.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.filter((c) => c.isActive).map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1 text-gray-700 truncate">{c.name}</span>
                <input
                  className="input w-24 text-right"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={pctDraft[c.id] ?? ""}
                  onChange={(e) => setPctDraft((d) => ({ ...d, [c.id]: e.target.value }))}
                />
                <span className="text-gray-400">%</span>
              </label>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className={`text-sm font-semibold ${Math.abs(draftTotal - 100) < 0.01 ? "text-forest-700" : "text-red-600"}`}>
              Total: {draftTotal}%{Math.abs(draftTotal - 100) >= 0.01 && " — must equal 100%"}
            </span>
            <button
              className="btn-primary btn-sm"
              disabled={busy || Math.abs(draftTotal - 100) >= 0.01}
              onClick={savePercentages}
            >
              {busy ? "Saving…" : "Save percentages"}
            </button>
          </div>
        </div>
      )}

      <AddCategoryModal open={addOpen} onClose={() => setAddOpen(false)} onDone={reload} setNotice={setNotice} />
      <RenameModal c={renameTarget} onClose={() => setRenameTarget(null)} onDone={reload} setNotice={setNotice} />
      <TransferModal open={transferOpen} onClose={() => setTransferOpen(false)} categories={categories} onDone={reload} setNotice={setNotice} />
    </div>
  );
}

function JarCard({ c, canEdit, onRename, onDelete, busy }) {
  const pctUsed = c.allocated > 0 ? Math.min(100, (c.spent / c.allocated) * 100) : 0;
  const barColor = pctUsed >= 100 ? "bg-red-500" : pctUsed >= 75 ? "bg-amber-500" : "bg-forest-600";
  return (
    <div className="card p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-bold text-gray-900">{c.name}</div>
          <div className="text-xs text-gray-500">{c.isActive ? `${c.percentage}% of incoming payments` : "Archived"}</div>
        </div>
        {canEdit && (
          <div className="flex gap-1">
            <button className="btn-ghost btn-sm" onClick={onRename} title="Rename">Edit</button>
            <ConfirmButton
              className="btn-ghost btn-sm text-red-600"
              confirmText={`Delete "${c.name}"? A category holding funds must be transferred out first.`}
              onConfirm={onDelete}
            />
          </div>
        )}
      </div>
      <div className="text-sm text-gray-600 flex justify-between">
        <span>Allocated <strong className="text-gray-900">{zarFull(c.allocated)}</strong></span>
        <span>Spent <strong className="text-red-600">{zarFull(c.spent)}</strong></span>
      </div>
      <div className="h-2 w-full rounded bg-gray-100 overflow-hidden">
        <div className={`h-full ${barColor}`} style={{ width: `${pctUsed}%` }} />
      </div>
      <div className="text-sm font-semibold text-forest-800">Available {zarFull(c.available)}</div>
    </div>
  );
}

function AddCategoryModal({ open, onClose, onDone, setNotice }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api.post("/api/finance/budget-categories", { name });
      setName("");
      setNotice({ type: "success", text: "Category added at 0%. Give it a share in the percentages below." });
      onDone();
      onClose();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal open={open} onClose={onClose} title="Add budget category">
      {err && <div className="mb-3"><Alert type="error">{err}</Alert></div>}
      <form onSubmit={submit} className="grid gap-4">
        <Field label="Name" required>
          <input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Water & sanitation" />
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Adding…" : "Add category"}</button>
        </div>
      </form>
    </Modal>
  );
}

function RenameModal({ c, onClose, onDone, setNotice }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  useEffect(() => { if (c) { setName(c.name); setErr(null); } }, [c]);
  if (!c) return null;
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api.put(`/api/finance/budget-categories/${c.id}`, { name });
      setNotice({ type: "success", text: "Category renamed." });
      onDone();
      onClose();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal open={!!c} onClose={onClose} title="Rename category">
      {err && <div className="mb-3"><Alert type="error">{err}</Alert></div>}
      <form onSubmit={submit} className="grid gap-4">
        <Field label="Name" required>
          <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </Modal>
  );
}

function TransferModal({ open, onClose, categories, onDone, setNotice }) {
  const movable = categories.filter((c) => c.isActive && c.available > 0);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  useEffect(() => { if (open) { setFromId(""); setToId(""); setAmount(""); setErr(null); } }, [open]);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api.post("/api/finance/budget-categories/transfer", { fromId: Number(fromId), toId: Number(toId), amount: Number(amount) });
      setNotice({ type: "success", text: "Funds transferred." });
      onDone();
      onClose();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal open={open} onClose={onClose} title="Transfer funds between categories">
      {err && <div className="mb-3"><Alert type="error">{err}</Alert></div>}
      {movable.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">No category holds an available balance to transfer yet.</p>
      ) : (
        <form onSubmit={submit} className="grid gap-4">
          <Field label="From" required>
            <select className="input" required value={fromId} onChange={(e) => setFromId(e.target.value)}>
              <option value="">Select…</option>
              {movable.map((c) => <option key={c.id} value={c.id}>{c.name} — {zarFull(c.available)}</option>)}
            </select>
          </Field>
          <Field label="To" required>
            <select className="input" required value={toId} onChange={(e) => setToId(e.target.value)}>
              <option value="">Select…</option>
              {categories.filter((c) => c.isActive && String(c.id) !== fromId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Amount (R)" required>
            <input className="input" type="number" min="0.01" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Transferring…" : "Transfer"}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
