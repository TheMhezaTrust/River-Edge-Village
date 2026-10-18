"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { Alert, Field, StatusPill } from "@/components/ui";
import { dateFmt } from "@/lib/format";

const FIELD_LABELS = { fullName: "Full name", idNumber: "ID number" };

export default function IdentityChangeRequests({ member, requests }) {
  const router = useRouter();
  const [field, setField] = useState("fullName");
  const [proposedValue, setProposedValue] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);

  const waiting = requests.filter((r) => r.status === "PENDING").map((r) => r.field);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      await api.post("/api/portal/change-request", { field, proposedValue, reason });
      setProposedValue("");
      setReason("");
      setSaved("Your request has been sent to the Trust office. You will see its status below.");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6">
      <h2 className="text-lg font-bold text-forest-900">Request a name or ID correction</h2>
      <p className="mt-1 text-sm text-gray-600">
        These details identify you as the plot holder on the Trust&apos;s records and on the sale agreement, so a
        member of the Trust office has to approve the change. You may be asked for a certified ID copy.
      </p>

      {saved && <div className="mt-4"><Alert type="success" onClose={() => setSaved(null)}>{saved}</Alert></div>}
      {error && <div className="mt-4"><Alert type="error">{error}</Alert></div>}

      <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="What needs correcting?" required>
          <select className="input" value={field} onChange={(e) => setField(e.target.value)} disabled={waiting.includes(field)}>
            <option value="fullName" disabled={waiting.includes("fullName")}>Full name</option>
            <option value="idNumber" disabled={waiting.includes("idNumber")}>ID number</option>
          </select>
        </Field>
        <Field label="Correct value" required>
          <input
            className="input"
            required
            value={proposedValue}
            onChange={(e) => setProposedValue(e.target.value)}
            placeholder={field === "idNumber" ? "e.g. 8001015800086" : "As it appears on your ID"}
          />
        </Field>
        <Field label="Why is this changing?" className="sm:col-span-2">
          <textarea
            className="input"
            rows={2}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Married and changed surname — marriage certificate available on request."
          />
        </Field>
        <div className="sm:col-span-2 flex justify-end">
          <button type="submit" className="btn-primary btn-sm" disabled={busy || waiting.includes(field)}>
            {busy ? "Sending…" : "Send request to the Trust"}
          </button>
        </div>
      </form>

      {waiting.includes(field) && (
        <p className="mt-2 text-xs text-amber-700">
          A {FIELD_LABELS[field].toLowerCase()} request is already waiting for the Trust to review it.
        </p>
      )}

      {requests.length > 0 && (
        <div className="mt-6 border-t border-gray-100 pt-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Your requests</h3>
          <ul className="space-y-2 text-sm">
            {requests.map((r) => (
              <li key={r.id} className="rounded-lg bg-gray-50 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-gray-900">{FIELD_LABELS[r.field] || r.field}</span>
                  <StatusPill status={r.status} />
                </div>
                <p className="mt-1 text-xs text-gray-600">
                  {r.currentValue || "(blank)"} → <span className="font-medium">{r.proposedValue}</span>
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  Requested {dateFmt(r.createdAt)}
                  {r.decidedAt ? ` · decided ${dateFmt(r.decidedAt)}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
