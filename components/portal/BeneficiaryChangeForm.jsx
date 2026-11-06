"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { Alert, Field, StatusPill } from "@/components/ui";
import { dateFmt } from "@/lib/format";

const blankRow = () => ({ name: "", idNumber: "", relation: "", share: "" });

// A member proposes a new set of beneficiaries here. The submission is queued as a
// change request — it never writes to the record directly — because a nomination has
// to be reviewed (and usually signed) before the Trust accepts it. The office approves
// it from the workstation, and only then do the nominations above change.
export default function BeneficiaryChangeForm({ beneficiaries = [], requests = [] }) {
  const router = useRouter();
  const [rows, setRows] = useState(() =>
    beneficiaries.length
      ? beneficiaries.map((b) => ({
          name: b.name || "",
          idNumber: b.idNumber || "",
          relation: b.relation || b.relationship || "",
          share: b.share || b.percentage || "",
        }))
      : [blankRow()],
  );
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);

  const pending = requests.some((r) => r.status === "PENDING");

  function update(i, key, value) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  }
  function addRow() {
    setRows((rs) => [...rs, blankRow()]);
  }
  function removeRow(i) {
    setRows((rs) => (rs.length === 1 ? [blankRow()] : rs.filter((_, idx) => idx !== i)));
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(null);
    const list = rows
      .map((r) => ({ ...r, name: r.name.trim(), idNumber: r.idNumber.trim(), relation: r.relation.trim(), share: r.share.trim() }))
      .filter((r) => r.name);
    if (!list.length) {
      setError("Add at least one beneficiary with a name.");
      setBusy(false);
      return;
    }
    try {
      await api.post("/api/portal/change-request", { field: "beneficiaries", proposedValue: list, reason });
      setReason("");
      setSaved("Your beneficiary change has been sent to the Trust for approval. It will not take effect until the office accepts it — you can see its status below.");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-lg font-bold text-forest-900">Update beneficiaries</h2>
        <p className="mt-1 text-sm text-gray-600 leading-relaxed">
          Submit the beneficiaries you want on your record. This sends a request to the Trust — it does{" "}
          <strong>not</strong> change your nominations straight away. A member of the Trust office reviews and,
          where needed, asks you to sign a nomination form before the change is approved.
        </p>

        {saved && <div className="mt-4"><Alert type="success" onClose={() => setSaved(null)}>{saved}</Alert></div>}
        {error && <div className="mt-4"><Alert type="error">{error}</Alert></div>}

        {pending ? (
          <p className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            You already have a beneficiary change waiting for the Trust to review. You can submit another once it
            has been decided.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-4">
            {rows.map((r, i) => (
              <div key={i} className="rounded-lg border border-gray-200 bg-gray-50/60 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">Beneficiary {i + 1}</span>
                  <button
                    type="button"
                    className="btn-ghost btn-sm text-red-600"
                    onClick={() => removeRow(i)}
                    disabled={busy}
                  >
                    Remove
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Full name" required>
                    <input className="input" required value={r.name} maxLength={120} disabled={busy}
                      onChange={(e) => update(i, "name", e.target.value)} placeholder="As it appears on their ID" />
                  </Field>
                  <Field label="ID number">
                    <input className="input" value={r.idNumber} maxLength={30} disabled={busy}
                      onChange={(e) => update(i, "idNumber", e.target.value)} placeholder="e.g. 9001015800086" />
                  </Field>
                  <Field label="Relationship">
                    <input className="input" value={r.relation} maxLength={60} disabled={busy}
                      onChange={(e) => update(i, "relation", e.target.value)} placeholder="e.g. Spouse, Child" />
                  </Field>
                  <Field label="Share">
                    <input className="input" value={r.share} maxLength={20} disabled={busy}
                      onChange={(e) => update(i, "share", e.target.value)} placeholder="e.g. 50%" />
                  </Field>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between gap-3">
              <button type="button" className="btn-outline btn-sm" onClick={addRow} disabled={busy || rows.length >= 10}>
                + Add beneficiary
              </button>
              <span className="text-xs text-gray-500">{rows.length} of 10 maximum</span>
            </div>

            <Field label="Why are you changing this? (optional)">
              <textarea className="input" rows={2} maxLength={500} value={reason} disabled={busy}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Adding my newborn child; marriage; a beneficiary has passed away." />
            </Field>

            <div className="flex justify-end">
              <button type="submit" className="btn-primary btn-sm" disabled={busy}>
                {busy ? "Sending…" : "Send request to the Trust"}
              </button>
            </div>
          </form>
        )}
      </div>

      {requests.length > 0 && (
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Your beneficiary change requests</h3>
          <ul className="space-y-2 text-sm">
            {requests.map((r) => (
              <li key={r.id} className="rounded-lg bg-gray-50 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-gray-900">Submitted {dateFmt(r.createdAt)}</span>
                  <StatusPill status={r.status} />
                </div>
                {r.reason && <p className="mt-1 text-xs text-gray-600">Reason: {r.reason}</p>}
                {r.decidedAt && <p className="mt-0.5 text-xs text-gray-400">Decided {dateFmt(r.decidedAt)}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
