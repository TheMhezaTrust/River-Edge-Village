"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api-client";
import { useFetch } from "@/components/ws/common";
import { Alert, Modal, Field } from "@/components/ui";
import PasswordConfirmModal from "@/components/ws/PasswordConfirmModal";
import { dateTimeFmt } from "@/lib/format";

// Beneficiaries live in a JSON string column and the register came off paper records,
// so the shape varies (array, single object, nothing) and `share` is freeform text
// ("50%", "the house"). lib/portal-data.js has the same parser but imports prisma, so
// it cannot be pulled into a client component — this is the browser-safe copy.
function parseList(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed) ? parsed : parsed && parsed.name ? [parsed] : [];
    return arr
      .filter((b) => b && b.name)
      .map((b) => ({
        name: b.name || "",
        idNumber: b.idNumber || "",
        relation: b.relation || b.relationship || "",
        share: b.share != null ? String(b.share) : b.percentage != null ? String(b.percentage) : "",
      }));
  } catch {
    return [];
  }
}

// "50%", "50", 50 -> 50; anything non-numeric -> 0, so a legacy freeform share still
// trips the 100% check instead of silently counting as a valid slice.
function parsePct(share) {
  if (share == null) return 0;
  const n = parseFloat(String(share).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

// Render a stored/proposed beneficiary JSON blob as readable lines for the queue.
function summarize(json) {
  const list = parseList(typeof json === "string" ? json : JSON.stringify(json ?? ""));
  if (!list.length) return ["(none)"];
  return list.map((b) => {
    const rel = b.relation ? ` (${b.relation})` : "";
    const share = b.share ? ` — ${b.share}` : "";
    return `${b.name}${rel}${share}`;
  });
}

const EMPTY_FORM = { name: "", idNumber: "", relation: "", pct: "" };

// Admin control over a member's beneficiaries: add/edit/delete with a strict
// "shares total exactly 100%" check before anything is written, plus the member's own
// pending portal change requests, which can be approved (applied) or rejected here.
export default function MemberBeneficiaries({ memberId, memberName, beneficiaries, canManage, onSaved }) {
  const saved = useMemo(() => parseList(beneficiaries), [beneficiaries]);
  const [rows, setRows] = useState(saved);
  // Re-sync only when the stored value actually changes (the prop is a string, so its
  // identity is stable across renders) — this keeps unsaved edits from being wiped.
  useEffect(() => { setRows(saved); }, [saved]);

  const [editing, setEditing] = useState(null); // { index, form }; index -1 means "add"
  const [modalError, setModalError] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null); // { id, decision }

  const { data: requests, reload: reloadRequests } = useFetch(
    `/api/members/change-requests?status=PENDING&memberId=${memberId}`
  );
  const queue = (requests || []).filter((r) => r.field === "beneficiaries");

  const total = Math.round(rows.reduce((s, r) => s + parsePct(r.share), 0) * 100) / 100;
  const namesOk = rows.every((r) => r.name && r.name.trim());
  // An empty list is allowed (a member may have nobody nominated); a non-empty one must
  // total exactly 100%.
  const totalOk = rows.length === 0 || Math.abs(total - 100) < 0.001;
  const valid = namesOk && totalOk;
  const dirty = JSON.stringify(rows) !== JSON.stringify(saved);

  function openAdd() {
    setError(null);
    setModalError(null);
    setEditing({ index: -1, form: { ...EMPTY_FORM } });
  }

  function openEdit(i) {
    setError(null);
    setModalError(null);
    const r = rows[i];
    setEditing({
      index: i,
      form: { name: r.name, idNumber: r.idNumber, relation: r.relation, pct: r.share === "" ? "" : String(parsePct(r.share)) },
    });
  }

  function setField(k, v) {
    setEditing((e) => ({ ...e, form: { ...e.form, [k]: v } }));
  }

  function commitRow(e) {
    e.preventDefault();
    const f = editing.form;
    if (!f.name.trim()) { setModalError("Full name is required."); return; }
    const pct = f.pct === "" ? 0 : parsePct(f.pct);
    const row = { name: f.name.trim(), idNumber: f.idNumber.trim(), relation: f.relation.trim(), share: `${pct}%` };
    setRows((prev) => (editing.index === -1 ? [...prev, row] : prev.map((r, i) => (i === editing.index ? row : r))));
    setEditing(null);
    setModalError(null);
  }

  function removeRow(i) {
    setError(null);
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save() {
    setError(null);
    if (rows.length && !namesOk) { setError("Every beneficiary needs a full name."); return; }
    if (!totalOk) {
      setError(`The percentage shares must add up to exactly 100%. They currently add up to ${total}%.`);
      return;
    }
    setBusy(true);
    try {
      const payload = rows.map((r) => ({ name: r.name, idNumber: r.idNumber || "", relation: r.relation || "", share: r.share }));
      await api.put(`/api/members/${memberId}`, { beneficiaries: payload });
      setNotice(rows.length ? "Beneficiaries saved." : "All beneficiaries removed.");
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function decide(confirmToken) {
    setBusy(true);
    setError(null);
    try {
      await api.put(`/api/members/change-requests/${pending.id}`, { decision: pending.decision, confirmToken });
      setNotice(pending.decision === "APPROVE" ? "Change approved and applied to the record." : "Change rejected.");
      setPending(null);
      reloadRequests();
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-gray-900">Beneficiaries</h2>
          {rows.length > 0 && (
            <p className={`mt-0.5 text-xs font-medium ${totalOk ? "text-forest-700" : "text-amber-700"}`}>
              {rows.length} nominated · shares total {total}%
            </p>
          )}
        </div>
        {canManage && (
          <button className="btn-outline btn-sm shrink-0" disabled={busy} onClick={openAdd}>+ Add</button>
        )}
      </div>

      {notice && <div className="mb-3"><Alert type="success" onClose={() => setNotice(null)}>{notice}</Alert></div>}
      {error && <div className="mb-3"><Alert type="error" onClose={() => setError(null)}>{error}</Alert></div>}

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">
          None nominated.{canManage ? " Use Add to nominate a beneficiary." : ""}
        </p>
      ) : (
        <ul className="space-y-2 text-sm">
          {rows.map((b, i) => (
            <li key={i} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{b.name}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {[b.idNumber, b.relation].filter(Boolean).join(" · ") || "No ID or relationship recorded"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs font-semibold text-forest-700">
                    {b.share || "—"}
                  </span>
                  {canManage && (
                    <>
                      <button className="btn-ghost btn-sm" disabled={busy} onClick={() => openEdit(i)}>Edit</button>
                      <button className="btn-ghost btn-sm text-red-600" disabled={busy} onClick={() => removeRow(i)}>Delete</button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManage && dirty && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
          <p className="text-xs text-gray-500">
            {valid ? "Unsaved changes — ready to save." : `Unsaved changes — shares must total 100% (now ${total}%).`}
          </p>
          <div className="flex gap-2">
            <button className="btn-ghost btn-sm" disabled={busy} onClick={() => { setRows(saved); setError(null); }}>Discard</button>
            <button className="btn-primary btn-sm" disabled={busy || !valid} onClick={save}>{busy ? "Saving…" : "Save changes"}</button>
          </div>
        </div>
      )}

      {queue.length > 0 && (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
          <h3 className="text-sm font-bold text-amber-900">
            Portal change requests <span>({queue.length})</span>
          </h3>
          <p className="mt-0.5 text-xs text-amber-800">
            {memberName} asked to change their beneficiaries. Approve to apply it to the official record, or reject to discard it.
          </p>
          <ul className="mt-3 space-y-3">
            {queue.map((r) => (
              <li key={r.id} className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-gray-400">Currently on record</p>
                    <ul className="mt-0.5 list-disc pl-4 text-gray-500">
                      {summarize(beneficiaries).map((l, i) => <li key={i}>{l}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-forest-700">Requested</p>
                    <ul className="mt-0.5 list-disc pl-4 font-medium text-gray-900">
                      {summarize(r.proposedValue).map((l, i) => <li key={i}>{l}</li>)}
                    </ul>
                  </div>
                </div>
                {r.reason && <p className="mt-2 text-xs text-gray-500">Reason: {r.reason}</p>}
                <p className="mt-1 text-xs text-gray-400">Requested {dateTimeFmt(r.createdAt)}</p>
                {canManage && (
                  <div className="mt-2 flex justify-end gap-2">
                    <button className="btn-primary btn-sm" disabled={busy} onClick={() => setPending({ id: r.id, decision: "APPROVE" })}>Approve</button>
                    <button className="btn-ghost btn-sm text-red-600" disabled={busy} onClick={() => setPending({ id: r.id, decision: "REJECT" })}>Reject</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Add / edit a single beneficiary */}
      <Modal open={Boolean(editing)} onClose={() => { setEditing(null); setModalError(null); }} title={editing?.index === -1 ? "Add beneficiary" : "Edit beneficiary"}>
        {editing && (
          <form onSubmit={commitRow} className="space-y-4">
            {modalError && <Alert type="error">{modalError}</Alert>}
            <Field label="Full Name" required>
              <input className="input" required value={editing.form.name} onChange={(e) => setField("name", e.target.value)} placeholder="As it appears on their ID" />
            </Field>
            <Field label="ID Number">
              <input className="input" value={editing.form.idNumber} maxLength={30} onChange={(e) => setField("idNumber", e.target.value)} placeholder="e.g. 9001015800086" />
            </Field>
            <Field label="Relationship">
              <input className="input" value={editing.form.relation} maxLength={60} onChange={(e) => setField("relation", e.target.value)} placeholder="e.g. Spouse, Child" />
            </Field>
            <Field label="Percentage Share (%)">
              <input className="input" type="number" min="0" max="100" step="0.01" value={editing.form.pct} onChange={(e) => setField("pct", e.target.value)} placeholder="e.g. 50" />
            </Field>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => { setEditing(null); setModalError(null); }}>Cancel</button>
              <button type="submit" className="btn-primary">{editing.index === -1 ? "Add" : "Update"}</button>
            </div>
          </form>
        )}
      </Modal>

      <PasswordConfirmModal
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        onConfirmed={decide}
        title={pending?.decision === "APPROVE" ? "Approve beneficiary change" : "Reject beneficiary change"}
        description={
          pending?.decision === "APPROVE"
            ? `Approving replaces ${memberName}'s beneficiaries on the official record with the requested list immediately. Re-enter your password to continue.`
            : `This discards ${memberName}'s requested beneficiary change and leaves the record as it is. Re-enter your password to continue.`
        }
      />
    </div>
  );
}
