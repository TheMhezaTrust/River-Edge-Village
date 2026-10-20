"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { useFetch, LoadingBlock, ErrorBlock } from "@/components/ws/common";
import { usePermissions, ReadOnlyNote } from "@/components/ws/permissions";
import { Modal, Field, Alert } from "@/components/ui";
import PasswordConfirmModal from "@/components/ws/PasswordConfirmModal";
import { zarFull, dateFmt } from "@/lib/format";

// Period locking, the correction (adjustment) path, and audit-log integrity. Closing
// a period is permanent, so it is password-confirmed; once closed, the only way to
// fix that month's books is an adjustment dated in an open period.
export default function ControlsTab() {
  const { can } = usePermissions();
  const canEdit = can("finance:admin");
  const canAudit = can("audit:view");

  const { data: periods, loading, error, reload: reloadPeriods } = useFetch("/api/finance/periods");
  const { data: accounts } = useFetch("/api/finance/accounts");
  const { data: adjustments, reload: reloadAdj } = useFetch("/api/finance/adjustments");

  const [notice, setNotice] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null); // { periodKey, kind, label }
  const [adjOpen, setAdjOpen] = useState(false);
  const [verify, setVerify] = useState(null);
  const [verifying, setVerifying] = useState(false);

  if (loading && !periods) return <LoadingBlock label="Loading controls…" />;
  if (error) return <ErrorBlock message={error} />;

  async function doClose(confirmToken) {
    try {
      await api.post("/api/finance/periods", { periodKey: confirmTarget.periodKey, kind: confirmTarget.kind, confirmToken });
      setNotice({ type: "success", text: `Period ${confirmTarget.label} is now closed. Its transactions are permanently locked.` });
      setConfirmTarget(null);
      reloadPeriods();
    } catch (e) {
      setNotice({ type: "error", text: e.message });
    }
  }

  async function runVerify() {
    setVerifying(true);
    try {
      setVerify(await api.get("/api/admin/audit/verify"));
    } catch (e) {
      setVerify({ error: e.message });
    } finally {
      setVerifying(false);
    }
  }

  const accountList = accounts || [];

  return (
    <div className="space-y-6">
      {!canEdit && <ReadOnlyNote label="period locking and adjustments" />}
      {notice && <Alert type={notice.type}>{notice.text}</Alert>}

      {/* Period locking */}
      <div className="card p-5">
        <h3 className="font-bold text-gray-900 mb-1">Close an accounting period</h3>
        <p className="text-xs text-gray-500 mb-4">
          Closing permanently locks every transaction in that month or year. No one — not even an administrator — can
          edit or delete a locked entry. Corrections are made by posting an adjustment into an open period.
        </p>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Months</h4>
            <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
              {periods.months.map((m) => (
                <PeriodRow key={m.periodKey} p={m} canEdit={canEdit} onClose={() => setConfirmTarget(m)} />
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Financial years</h4>
            <div className="space-y-1">
              {periods.years.map((y) => (
                <PeriodRow key={y.periodKey} p={y} canEdit={canEdit} onClose={() => setConfirmTarget(y)} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Adjustments */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-gray-900">Adjustments</h3>
            <p className="text-xs text-gray-500">Balanced correcting entries posted into an open period.</p>
          </div>
          {canEdit && <button className="btn-primary btn-sm" onClick={() => setAdjOpen(true)}>+ Post adjustment</button>}
        </div>
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>Date</th><th>Txn</th><th>Description</th><th className="text-right">Amount</th></tr></thead>
            <tbody>
              {(adjustments || []).map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap">{dateFmt(a.date)}</td>
                  <td className="text-xs font-mono">{a.txnNo}</td>
                  <td className="font-medium">{a.description}{a.reversesId ? <span className="text-xs text-gray-500"> · corrects #{a.reversesId}</span> : null}</td>
                  <td className="text-right whitespace-nowrap">{zarFull(a.amount)}</td>
                </tr>
              ))}
              {(!adjustments || adjustments.length === 0) && (
                <tr><td colSpan={4} className="text-center text-gray-500 py-8">No adjustments posted.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit integrity */}
      {canAudit && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-bold text-gray-900">Audit log integrity</h3>
              <p className="text-xs text-gray-500">
                The audit log is hash-chained: each entry carries a hash of its contents linked to the one before it, so
                altering or reordering a record breaks the chain.
              </p>
            </div>
            <button className="btn-outline btn-sm" onClick={runVerify} disabled={verifying}>
              {verifying ? "Verifying…" : "Verify chain"}
            </button>
          </div>
          {verify?.error && <Alert type="error">{verify.error}</Alert>}
          {verify && !verify.error && (
            <div className="mt-3">
              {verify.intact ? (
                <Alert type="success">
                  Chain intact — {verify.chained} linked entries verified{verify.legacy ? `, ${verify.legacy} legacy (pre-chain)` : ""}.
                </Alert>
              ) : (
                <Alert type="error">
                  Chain broken at {verify.brokenCount} entr{verify.brokenCount === 1 ? "y" : "ies"}
                  {verify.forks ? ` (${verify.forks} fork point${verify.forks === 1 ? "" : "s"} — a concurrent write or tampering)` : ""}.
                  {verify.broken?.[0] ? ` First: #${verify.broken[0].id} — ${verify.broken[0].reason}.` : ""}
                </Alert>
              )}
            </div>
          )}
        </div>
      )}

      <AdjustmentModal open={adjOpen} onClose={() => setAdjOpen(false)} accounts={accountList} onDone={() => { reloadAdj(); setNotice({ type: "success", text: "Adjustment posted." }); }} />

      <PasswordConfirmModal
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirmed={doClose}
        title="Close accounting period"
        description={confirmTarget ? `This permanently locks ${confirmTarget.label}. This cannot be undone. Re-enter your password to confirm.` : ""}
      />
    </div>
  );
}

function PeriodRow({ p, canEdit, onClose }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded border border-gray-100 px-3 py-1.5">
      <span className="text-sm text-gray-700">{p.label}</span>
      {p.closed ? (
        <span className="text-xs font-semibold text-red-600 whitespace-nowrap">Closed {p.closedAt ? dateFmt(p.closedAt) : ""}</span>
      ) : canEdit ? (
        <button className="btn-outline btn-sm" onClick={onClose}>Close</button>
      ) : (
        <span className="text-xs text-gray-400">Open</span>
      )}
    </div>
  );
}

function AdjustmentModal({ open, onClose, accounts, onDone }) {
  const today = () => new Date().toISOString().slice(0, 10);
  const blank = () => [
    { accountCode: "", debit: "", credit: "", memo: "" },
    { accountCode: "", debit: "", credit: "", memo: "" },
  ];
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState(blank());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  function reset() { setDate(today()); setDescription(""); setLines(blank()); setErr(null); }
  function close() { reset(); onClose(); }

  const setLine = (i, k) => (e) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: e.target.value } : l)));
  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api.post("/api/finance/adjustments", {
        date,
        description,
        lines: lines.map((l) => ({ accountCode: l.accountCode, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0, memo: l.memo })),
      });
      close();
      onDone();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={close} title="Post an adjustment" wide>
      {err && <div className="mb-3"><Alert type="error">{err}</Alert></div>}
      <form onSubmit={submit} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date (must be in an open period)" required>
            <input className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Description" required>
            <input className="input" required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Correct March Eskom allocation" />
          </Field>
        </div>

        <div className="overflow-x-auto">
          <table className="table-base text-sm">
            <thead><tr><th>Account</th><th className="text-right">Debit</th><th className="text-right">Credit</th><th>Memo</th><th></th></tr></thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td>
                    <select className="input" required value={l.accountCode} onChange={setLine(i, "accountCode")}>
                      <option value="">Select…</option>
                      {accounts.map((a) => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}
                    </select>
                  </td>
                  <td><input className="input text-right" type="number" min="0" step="0.01" value={l.debit} onChange={setLine(i, "debit")} /></td>
                  <td><input className="input text-right" type="number" min="0" step="0.01" value={l.credit} onChange={setLine(i, "credit")} /></td>
                  <td><input className="input" value={l.memo} onChange={setLine(i, "memo")} /></td>
                  <td>
                    {lines.length > 2 && (
                      <button type="button" className="btn-ghost btn-sm text-red-600" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>×</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                <td className="text-gray-700">Totals</td>
                <td className="text-right">{zarFull(totalDebit)}</td>
                <td className="text-right">{zarFull(totalCredit)}</td>
                <td colSpan={2} className={balanced ? "text-forest-700" : "text-red-600"}>{balanced ? "Balanced" : "Must balance"}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <button type="button" className="btn-outline btn-sm justify-self-start" onClick={() => setLines((ls) => [...ls, { accountCode: "", debit: "", credit: "", memo: "" }])}>+ Add line</button>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={close}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy || !balanced}>{busy ? "Posting…" : "Post adjustment"}</button>
        </div>
      </form>
    </Modal>
  );
}
