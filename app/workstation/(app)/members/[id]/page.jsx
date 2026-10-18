"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { useFetch, PageHeader, LoadingBlock, ErrorBlock, ConfirmButton } from "@/components/ws/common";
import { usePermissions, ReadOnlyNote } from "@/components/ws/permissions";
import { Modal, Field, StatusPill, Alert } from "@/components/ui";
import PortalAccessPanel from "@/components/ws/PortalAccessPanel";
import PasswordConfirmModal from "@/components/ws/PasswordConfirmModal";
import { zarFull, dateFmt, METHOD_LABELS } from "@/lib/format";

const today = () => new Date().toISOString().slice(0, 10);
// A DateTime arrives as an ISO string; a date input wants "YYYY-MM-DD".
const dateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

// Payments captured before the income ledger was linked to them cannot be matched to
// their income row reliably, so a correction moves one side and not the other.
const UNSYNCED_INCOME =
  "This payment was captured before payments were linked to the income ledger, so its income record could not be updated automatically. Correct it by hand under Finance → Income so the cashflow report matches this statement.";

export default function MemberDetailPage() {
  const { id } = useParams();
  const { can } = usePermissions();
  const canEditMember = can("members:manage");
  const canRecordPayment = can("finance:manage");
  const canEditPlots = can("plots:manage");
  const canCorrectPayments = can("payments:correct");
  const { data: member, loading, error, reload } = useFetch(`/api/members/${id}`);
  const [payOpen, setPayOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [payForm, setPayForm] = useState({ amount: "", method: "EFT", reference: "", note: "", plotId: "", date: today() });
  const [editForm, setEditForm] = useState(null);
  const [plotForm, setPlotForm] = useState(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [available, setAvailable] = useState(null);
  const [payEditForm, setPayEditForm] = useState(null);
  // A password re-confirmation waiting to run: { title, description, run(token) }.
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const [notice, setNotice] = useState(null);

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
  const plotsSum = (member.plots || []).reduce((s, p) => s + (p.price || 0), 0);
  // A member-level price override masks the sum of the plot prices everywhere the
  // balance is shown, so the admin has to be told it is in force before editing plots.
  const priceOverridden = member.purchasePrice != null;

  async function recordPayment(e) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      await api.post(`/api/members/${id}/payments`, payForm);
      setPayOpen(false);
      setPayForm({ amount: "", method: "EFT", reference: "", note: "", plotId: "", date: today() });
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function openEdit() {
    setFormError(null);
    setEditForm({
      fullName: member.fullName || "", idNumber: member.idNumber || "", phone: member.phone || "",
      email: member.email || "", physicalAddress: member.physicalAddress || "", postalAddress: member.postalAddress || "",
      purchasePrice: member.purchasePrice ?? "", purchaseDate: dateInput(member.purchaseDate),
      paymentPlan: member.paymentPlan || "", notes: member.notes || "",
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

  function openPlotEdit(p) {
    setFormError(null);
    setPlotForm({
      id: p.id, number: p.number, originalNumber: p.number, block: p.block || "",
      sizeSqm: p.sizeSqm, price: p.price ?? "", purchasedAt: dateInput(p.purchasedAt),
    });
  }

  async function savePlot(e) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      await api.put(`/api/plots/${plotForm.id}`, {
        number: plotForm.number,
        block: plotForm.block || null,
        sizeSqm: Number(plotForm.sizeSqm),
        price: Number(plotForm.price),
        purchasedAt: plotForm.purchasedAt || null,
      });
      setPlotForm(null);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function unassignPlot(p) {
    setBusy(true);
    setFormError(null);
    try {
      await api.put(`/api/plots/${p.id}`, { memberId: null });
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function openAssign() {
    setAssignOpen(true);
    setAvailable(null);
    setFormError(null);
    try {
      setAvailable(await api.get("/api/plots?status=AVAILABLE"));
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function assignPlot(plotId) {
    setBusy(true);
    setFormError(null);
    try {
      await api.put(`/api/plots/${plotId}`, { memberId: Number(id) });
      setAssignOpen(false);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function openPayEdit(p) {
    setFormError(null);
    setPayEditForm({
      id: p.id, amount: p.amount, date: dateInput(p.date), method: p.method,
      reference: p.reference || "", note: p.note || "", plotId: p.plotId ?? "",
    });
  }

  function submitPayEdit(e) {
    e.preventDefault();
    setFormError(null);
    const form = payEditForm;
    setConfirm({
      title: "Confirm this correction",
      description:
        "You are changing a payment the Trust has already recorded as received. The member's statement and the income ledger will both move. Re-enter your password to continue.",
      run: async (token) => {
        const res = await api.put(`/api/payments/${form.id}`, {
          amount: Number(form.amount),
          date: form.date,
          method: form.method,
          reference: form.reference,
          note: form.note,
          plotId: form.plotId,
          confirmToken: token,
        });
        setPayEditForm(null);
        if (res.incomeSynced === false) setNotice(UNSYNCED_INCOME);
        reload();
      },
    });
  }

  function askDeletePayment(p) {
    setFormError(null);
    setConfirm({
      title: "Delete this payment?",
      description: `${zarFull(p.amount)} received on ${dateFmt(p.date)}${p.reference ? ` (reference ${p.reference})` : ""} will be removed from this member's statement and from the Trust's income records. This cannot be undone.`,
      run: async (token) => {
        const res = await api.del(`/api/payments/${p.id}?confirmToken=${encodeURIComponent(token)}`);
        if (res.incomeSynced === false) setNotice(UNSYNCED_INCOME);
        reload();
      },
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={member.fullName}
        subtitle={`${member.purchaseDate ? `Joined ${dateFmt(member.purchaseDate)}` : `Member since ${dateFmt(member.createdAt)}`} · ${member.email} · ${member.phone}`}
        actions={
          <>
            <Link href="/workstation/members" className="btn-ghost btn-sm">← All members</Link>
            {canEditMember && <button className="btn-outline btn-sm" onClick={openEdit}>Edit</button>}
            {canRecordPayment && <button className="btn-primary btn-sm" onClick={() => setPayOpen(true)}>💵 Record Payment</button>}
          </>
        }
      />

      {!canEditMember && !canRecordPayment && <ReadOnlyNote label="this member's record" />}
      {notice && <Alert type="info" onClose={() => setNotice(null)}>{notice}</Alert>}
      {formError && !plotForm && !payEditForm && !editOpen && !payOpen && !assignOpen && (
        <Alert type="error" onClose={() => setFormError(null)}>{formError}</Alert>
      )}

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
                ["Date Joined", member.purchaseDate ? dateFmt(member.purchaseDate) : null],
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
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-bold text-gray-900">Plot Information</h2>
              {canEditPlots && (
                <button className="btn-outline btn-sm" disabled={busy} onClick={openAssign}>Assign a plot</button>
              )}
            </div>
            {member.plots?.length ? (
              <div className="space-y-3">
                {member.plots.map((p) => (
                  <div key={p.id} className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm">
                    <div className="flex justify-between">
                      <Link href="/workstation/plots" className="font-semibold text-forest-700 hover:underline">Plot {p.number}{p.block ? ` (Block ${p.block})` : ""}</Link>
                      <StatusPill status={p.status} />
                    </div>
                    <div className="mt-1.5 flex justify-between text-gray-500"><span>Size</span><span className="font-medium text-gray-900">{p.sizeSqm}m²</span></div>
                    <div className="flex justify-between text-gray-500"><span>Price</span><span className="font-medium text-gray-900">{zarFull(p.price)}</span></div>
                    <div className="flex justify-between text-gray-500"><span>Purchased</span><span className="font-medium text-gray-900">{p.purchasedAt ? dateFmt(p.purchasedAt) : "Not recorded"}</span></div>
                    {canEditPlots && (
                      <div className="mt-2.5 flex justify-end gap-2 border-t border-gray-200 pt-2.5">
                        <ConfirmButton
                          label="Unassign"
                          className="btn-ghost btn-sm"
                          confirmText={`Remove Plot ${p.number} from ${member.fullName}? It becomes available again and their balance drops by ${zarFull(p.price)}.`}
                          onConfirm={() => unassignPlot(p)}
                        />
                        <button className="btn-outline btn-sm" disabled={busy} onClick={() => openPlotEdit(p)}>Edit plot</button>
                      </div>
                    )}
                  </div>
                ))}
                <div className="flex justify-between text-sm pt-1">
                  <span className="text-gray-500">{priceOverridden ? "Plot prices add up to" : `Total (${member.plots.length} plot(s))`}</span>
                  <span className="font-bold text-gray-900">{zarFull(priceOverridden ? plotsSum : price)}</span>
                </div>
                {priceOverridden && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Charged (member override)</span>
                      <span className="font-bold text-amber-700">{zarFull(price)}</span>
                    </div>
                    <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                      A purchase price of <strong>{zarFull(member.purchasePrice)}</strong> is set on the member
                      record itself, so it — not the plot prices above — is what every balance is calculated
                      from. Clear the Purchase Price field under Edit to go back to using the plot prices.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No plot assigned.{canEditPlots ? " Use Assign a plot to attach an available erf." : ""}
              </p>
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

          <PortalAccessPanel member={member} canManage={canEditMember} reload={reload} />
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
                <thead>
                  <tr>
                    <th>Date</th><th>Note</th><th>Method</th><th>Reference</th>
                    <th className="text-right">Amount</th>
                    {canCorrectPayments && <th className="text-right">Correct</th>}
                  </tr>
                </thead>
                <tbody>
                  {member.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="whitespace-nowrap">{dateFmt(p.date)}</td>
                      <td>{p.note || "-"}</td>
                      <td>{METHOD_LABELS[p.method] || p.method}</td>
                      <td className="font-mono text-xs text-gray-500">{p.reference || "-"}</td>
                      <td className="text-right font-bold text-forest-700 whitespace-nowrap">{zarFull(p.amount)}</td>
                      {canCorrectPayments && (
                        <td className="whitespace-nowrap text-right">
                          <button className="btn-ghost btn-sm" disabled={busy} onClick={() => openPayEdit(p)}>Edit</button>
                          <button className="btn-ghost btn-sm text-red-600" disabled={busy} onClick={() => askDeletePayment(p)}>Delete</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {canCorrectPayments && member.payments.length > 0 && (
              <p className="border-t border-gray-100 px-6 py-3 text-xs text-gray-500">
                Editing or deleting a past payment rewrites the Trust's recorded income, so it is restricted to
                Administrators and asks for your password each time.
              </p>
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
                {Object.entries(METHOD_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
          </div>
          {member.plots?.length > 1 && (
            <Field label="Apply to plot">
              <select className="input" value={payForm.plotId} onChange={(e) => setPayForm((f) => ({ ...f, plotId: e.target.value }))}>
                <option value="">Unallocated (general payment)</option>
                {member.plots.map((p) => <option key={p.id} value={p.id}>Plot {p.number}{p.block ? ` (Block ${p.block})` : ""}</option>)}
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
            ].map(([key, label, type, req]) => (
              <Field key={key} label={label} required={req}>
                <input className="input" type={type} required={req} value={editForm[key]} onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))} />
              </Field>
            ))}
            <Field label="Date Joined / Date of Purchase">
              <input className="input" type="date" value={editForm.purchaseDate} onChange={(e) => setEditForm((f) => ({ ...f, purchaseDate: e.target.value }))} />
            </Field>
            <Field label="Payment Plan">
              <select className="input" value={editForm.paymentPlan} onChange={(e) => setEditForm((f) => ({ ...f, paymentPlan: e.target.value }))}>
                <option value="">-</option><option value="FULL">Full payment</option><option value="PLAN_6">6 months</option><option value="PLAN_12">12 months</option><option value="PLAN_24">24 months</option>
              </select>
            </Field>
            <Field label="Purchase Price Override (R)" className="sm:col-span-2">
              <input className="input" type="number" min="0" step="0.01" value={editForm.purchasePrice} onChange={(e) => setEditForm((f) => ({ ...f, purchasePrice: e.target.value }))} />
              <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
                {priceOverridden
                  ? `In force at ${zarFull(member.purchasePrice)}. This replaces the sum of the plot prices (${zarFull(plotsSum)}) everywhere the balance is shown. Clear the field to remove the override.`
                  : `Leave empty to charge the sum of this member's plot prices (${zarFull(plotsSum)}). Set a figure only when the signed contract differs from the plot prices on record.`}
              </p>
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

      {/* Correct one erf against the signed contract */}
      <Modal open={Boolean(plotForm)} onClose={() => setPlotForm(null)} title={plotForm ? `Edit Plot ${plotForm.originalNumber}` : "Edit Plot"}>
        {plotForm && (
          <form onSubmit={savePlot} className="space-y-4">
            {formError && <Alert type="error">{formError}</Alert>}
            {plotForm.number !== plotForm.originalNumber && (
              <Alert type="info">
                Changing the plot number moves this erf away from its position on the survey-plan layout, and
                breaks the <strong>Plot Number – Buyer Name</strong> bank reference convention (T&amp;C 6.4) for
                every payment already recorded against it.
              </Alert>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Plot Number" required>
                <input className="input" required value={plotForm.number} onChange={(e) => setPlotForm((f) => ({ ...f, number: e.target.value }))} />
              </Field>
              <Field label="Block">
                <input className="input" value={plotForm.block} placeholder="A" onChange={(e) => setPlotForm((f) => ({ ...f, block: e.target.value }))} />
              </Field>
              <Field label="Size (m²)" required>
                <input className="input" type="number" min="1" required value={plotForm.sizeSqm} onChange={(e) => setPlotForm((f) => ({ ...f, sizeSqm: e.target.value }))} />
              </Field>
              <Field label="Purchase Price (R)" required>
                <input className="input" type="number" min="0" step="0.01" required value={plotForm.price} onChange={(e) => setPlotForm((f) => ({ ...f, price: e.target.value }))} />
              </Field>
            </div>
            <Field label="Date of Purchase">
              <input className="input" type="date" value={plotForm.purchasedAt} onChange={(e) => setPlotForm((f) => ({ ...f, purchasedAt: e.target.value }))} />
              <p className="mt-1.5 text-xs text-gray-500">
                When this member bought this erf. Members who bought more than one plot often bought them on
                different dates, and at different prices.
              </p>
            </Field>
            {priceOverridden && (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                This member has a purchase price override of {zarFull(member.purchasePrice)} on their record, so
                changing this plot's price will not change what they are charged until the override is cleared.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setPlotForm(null)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save Plot"}</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Attach an available erf to this member */}
      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title={`Assign a plot to ${member.fullName}`}>
        {formError && <div className="mb-3"><Alert type="error">{formError}</Alert></div>}
        {!available ? (
          <LoadingBlock label="Loading available plots…" />
        ) : available.length === 0 ? (
          <p className="text-sm text-gray-500">Every erf in this project is already reserved or sold.</p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">
            {available.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <span>
                  <strong>Plot {p.number}</strong>{p.block ? ` · Block ${p.block}` : ""} · {p.sizeSqm}m² · {zarFull(p.price)}
                </span>
                <button className="btn-outline btn-sm shrink-0" disabled={busy} onClick={() => assignPlot(p.id)}>Assign</button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-gray-500">
          Assigning marks the erf as Sold and adds its price to this member's balance immediately.
        </p>
      </Modal>

      {/* Correct a payment already recorded as received */}
      <Modal open={Boolean(payEditForm)} onClose={() => setPayEditForm(null)} title={`Correct Payment — ${member.fullName}`}>
        {payEditForm && (
          <form onSubmit={submitPayEdit} className="space-y-4">
            {formError && <Alert type="error">{formError}</Alert>}
            <Alert type="info">
              This rewrites a payment the Trust has already banked. The matching income record moves with it, so
              the cashflow report and this member's statement stay in agreement.
            </Alert>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Amount (R)" required>
                <input className="input" type="number" min="0.01" step="0.01" required value={payEditForm.amount} onChange={(e) => setPayEditForm((f) => ({ ...f, amount: e.target.value }))} />
              </Field>
              <Field label="Date" required>
                <input className="input" type="date" required value={payEditForm.date} onChange={(e) => setPayEditForm((f) => ({ ...f, date: e.target.value }))} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Method">
                <select className="input" value={payEditForm.method} onChange={(e) => setPayEditForm((f) => ({ ...f, method: e.target.value }))}>
                  {Object.entries(METHOD_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="Bank Reference">
                <input className="input" value={payEditForm.reference} onChange={(e) => setPayEditForm((f) => ({ ...f, reference: e.target.value }))} />
              </Field>
            </div>
            <Field label="Apply to plot">
              <select className="input" value={payEditForm.plotId} onChange={(e) => setPayEditForm((f) => ({ ...f, plotId: e.target.value }))}>
                <option value="">Unallocated (general payment)</option>
                {(member.plots || []).map((p) => <option key={p.id} value={p.id}>Plot {p.number}{p.block ? ` (Block ${p.block})` : ""}</option>)}
              </select>
            </Field>
            <Field label="Note">
              <input className="input" value={payEditForm.note} onChange={(e) => setPayEditForm((f) => ({ ...f, note: e.target.value }))} placeholder="e.g. Instalment 7/12" />
            </Field>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setPayEditForm(null)}>Cancel</button>
              <button type="submit" className="btn-primary">Save Correction…</button>
            </div>
          </form>
        )}
      </Modal>

      <PasswordConfirmModal
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm?.title}
        description={confirm?.description}
        onConfirmed={async (token) => {
          await confirm.run(token);
          setConfirm(null);
        }}
      />
    </div>
  );
}
