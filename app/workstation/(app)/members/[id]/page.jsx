"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { useFetch, PageHeader, LoadingBlock, ErrorBlock } from "@/components/ws/common";
import { usePermissions, ReadOnlyNote } from "@/components/ws/permissions";
import { Modal, Field, StatusPill, Alert } from "@/components/ui";
import { zar, zarFull, dateFmt } from "@/lib/format";

export default function MemberDetailPage() {
  const { id } = useParams();
  const { can } = usePermissions();
  const canEditMember = can("members:manage");
  const canRecordPayment = can("finance:manage");
  const { data: member, loading, error, reload } = useFetch(`/api/members/${id}`);
  const [payOpen, setPayOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [payForm, setPayForm] = useState({ amount: "", method: "EFT", reference: "", note: "", plotId: "", date: new Date().toISOString().slice(0, 10) });
  const [editForm, setEditForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);

  if (loading && !member) return <LoadingBlock label="Loading member…" />;
  if (error) return <ErrorBlock message={error} />;
  if (!member) return null;

  const beneficiaries = (() => {
    try {
      const p = JSON.parse(member.beneficiaries || "[]");
      return Array.isArray(p) ? p : p?.name ? [p] : [];
    } catch { return []; }
  })();
  const price = member.price ?? 0;
  const progress = price > 0 ? Math.min(100, Math.round((member.totalPaid / price) * 100)) : 0;

  async function recordPayment(e) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      await api.post(`/api/members/${id}/payments`, payForm);
      setPayOpen(false);
      setPayForm({ amount: "", method: "EFT", reference: "", note: "", plotId: "", date: new Date().toISOString().slice(0, 10) });
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function openEdit() {
    setEditForm({
      fullName: member.fullName || "", idNumber: member.idNumber || "", phone: member.phone || "",
      email: member.email || "", physicalAddress: member.physicalAddress || "", postalAddress: member.postalAddress || "",
      purchasePrice: member.purchasePrice ?? "", paymentPlan: member.paymentPlan || "", notes: member.notes || "",
    });
    setEditOpen(true);
  }

  async function saveEdit(e) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      await api.put(`/api/members/${id}`, editForm);
      setEditOpen(false);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={member.fullName}
        subtitle={`Member since ${dateFmt(member.createdAt)} · ${member.email} · ${member.phone}`}
        actions={
          <>
            <Link href="/workstation/members" className="btn-ghost btn-sm">← All members</Link>
            {canEditMember && <button className="btn-outline btn-sm" onClick={openEdit}>Edit</button>}
            {canRecordPayment && <button className="btn-primary btn-sm" onClick={() => setPayOpen(true)}>💵 Record Payment</button>}
          </>
        }
      />

      {!canEditMember && !canRecordPayment && <ReadOnlyNote label="this member's record" />}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Personal + plot */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-bold text-gray-900 mb-4">Personal Information</h2>
            <dl className="space-y-2.5 text-sm">
              {[
                ["ID Number", member.idNumber],
                ["Date of Birth", member.dateOfBirth],
                ["Gender", member.gender],
                ["Marital Status", member.maritalStatus],
                ["Physical Address", member.physicalAddress],
                ["Postal Address", member.postalAddress],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-gray-500 shrink-0">{k}</dt>
                  <dd className="text-gray-900 font-medium text-right">{v || "-"}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="card p-6">
            <h2 className="font-bold text-gray-900 mb-4">Plot Information</h2>
            {member.plots?.length ? (
              <div className="space-y-3">
                {member.plots.map((p) => (
                  <div key={p.id} className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm">
                    <div className="flex justify-between">
                      <Link href="/workstation/plots" className="font-semibold text-forest-700 hover:underline">Plot {p.number} (Block {p.block})</Link>
                      <StatusPill status={p.status} />
                    </div>
                    <div className="mt-1.5 flex justify-between text-gray-500"><span>Size</span><span className="font-medium text-gray-900">{p.sizeSqm}m²</span></div>
                    <div className="flex justify-between text-gray-500"><span>Price</span><span className="font-medium text-gray-900">{zarFull(p.price)}</span></div>
                  </div>
                ))}
                <div className="flex justify-between text-sm pt-1"><span className="text-gray-500">Total ({member.plots.length} plot(s))</span><span className="font-bold text-gray-900">{zarFull(price)}</span></div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No plot assigned.</p>
            )}

            <div className="mt-5 pt-4 border-t border-gray-100">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 font-medium">Payment progress</span>
                <span className="font-bold text-forest-700">{progress}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-gray-200 overflow-hidden">
                <div className="h-full bg-forest-600 rounded-full" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-xs text-gray-500">
                <span>Paid: <strong>{zarFull(member.totalPaid)}</strong></span>
                <span>Balance: <strong className={member.outstandingBalance > 0 ? "text-red-600" : ""}>{zarFull(member.outstandingBalance)}</strong></span>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-bold text-gray-900 mb-4">Beneficiaries</h2>
            {beneficiaries.length === 0 ? (
              <p className="text-sm text-gray-500">None nominated.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {beneficiaries.map((b, i) => (
                  <li key={i} className="flex justify-between rounded-lg bg-gray-50 px-3 py-2">
                    <span className="font-medium">{b.name}</span><span className="text-gray-500">{b.relation}{b.share ? ` · ${b.share}` : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Payments + documents + notes */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="font-bold text-gray-900">Payment History</h2>
              <span className="text-sm text-gray-500">{member.payments.length} payment(s)</span>
            </div>
            {member.payments.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">No payments recorded.</p>
            ) : (
              <table className="table-base">
                <thead><tr><th>Date</th><th>Note</th><th>Method</th><th>Reference</th><th className="text-right">Amount</th></tr></thead>
                <tbody>
                  {member.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="whitespace-nowrap">{dateFmt(p.date)}</td>
                      <td>{p.note || "-"}</td>
                      <td>{p.method}</td>
                      <td className="font-mono text-xs text-gray-500">{p.reference || "-"}</td>
                      <td className="text-right font-bold text-forest-700 whitespace-nowrap">{zarFull(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card p-6">
            <h2 className="font-bold text-gray-900 mb-2">Notes</h2>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{member.notes || "No notes yet. Use Edit to add notes about this member."}</p>
          </div>
        </div>
      </div>

      {/* Record payment modal */}
      <Modal open={payOpen} onClose={() => setPayOpen(false)} title={`Record Payment — ${member.fullName}`}>
        {formError && <div className="mb-3"><Alert type="error">{formError}</Alert></div>}
        <form onSubmit={recordPayment} className="space-y-4">
          <Field label="Amount (R)" required><input className="input" type="number" min="1" step="0.01" required value={payForm.amount} onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date"><input className="input" type="date" value={payForm.date} onChange={(e) => setPayForm((f) => ({ ...f, date: e.target.value }))} /></Field>
            <Field label="Method">
              <select className="input" value={payForm.method} onChange={(e) => setPayForm((f) => ({ ...f, method: e.target.value }))}>
                {["EFT", "CASH", "CARD", "DEBIT_ORDER"].map((m) => <option key={m}>{m}</option>)}
              </select>
            </Field>
          </div>
          {member.plots?.length > 1 && (
            <Field label="Apply to plot">
              <select className="input" value={payForm.plotId} onChange={(e) => setPayForm((f) => ({ ...f, plotId: e.target.value }))}>
                <option value="">Unallocated (general payment)</option>
                {member.plots.map((p) => <option key={p.id} value={p.id}>Plot {p.number} (Block {p.block})</option>)}
              </select>
            </Field>
          )}
          <Field label="Bank Reference"><input className="input" value={payForm.reference} onChange={(e) => setPayForm((f) => ({ ...f, reference: e.target.value }))} placeholder={`${member.plots?.[0]?.number || "000"} – ${member.fullName}`} /></Field>
          <Field label="Note"><input className="input" value={payForm.note} onChange={(e) => setPayForm((f) => ({ ...f, note: e.target.value }))} placeholder="e.g. Instalment 7/12" /></Field>
          <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? "Saving…" : "Record Payment"}</button>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Member" wide>
        {editForm && (
          <form onSubmit={saveEdit} className="grid gap-4 sm:grid-cols-2">
            {formError && <div className="sm:col-span-2"><Alert type="error">{formError}</Alert></div>}
            {[
              ["fullName", "Full Name", "text", true], ["idNumber", "ID Number", "text"], ["phone", "Phone", "text", true],
              ["email", "Email", "email", true], ["physicalAddress", "Physical Address", "text"], ["postalAddress", "Postal Address", "text"],
              ["purchasePrice", "Purchase Price", "number"],
            ].map(([key, label, type, req]) => (
              <Field key={key} label={label} required={req}>
                <input className="input" type={type} required={req} value={editForm[key]} onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))} />
              </Field>
            ))}
            <Field label="Payment Plan">
              <select className="input" value={editForm.paymentPlan} onChange={(e) => setEditForm((f) => ({ ...f, paymentPlan: e.target.value }))}>
                <option value="">-</option><option value="FULL">Full payment</option><option value="PLAN_6">6 months</option><option value="PLAN_12">12 months</option><option value="PLAN_24">24 months</option>
              </select>
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <textarea className="input" rows={3} value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} />
            </Field>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setEditOpen(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save Changes"}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
