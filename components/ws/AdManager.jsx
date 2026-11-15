"use client";

import { useMemo, useRef, useState } from "react";
import { uploadPresigned } from "@vercel/blob/client";
import { api } from "@/lib/api-client";
import { useFetch, PageHeader, LoadingBlock, ErrorBlock } from "@/components/ws/common";
import { Alert, Field, Modal, StatCard, EmptyState } from "@/components/ui";
import { zar, dateFmt, dateTimeFmt } from "@/lib/format";

const DEFAULT_DURATION_MS = 3000;
const MIN_DURATION_MS = 500;
const MAX_DURATION_MS = 600000;
const METHODS = [
  { value: "EFT", label: "EFT" },
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "OTHER", label: "Other" },
];

const todayInput = () => new Date().toISOString().slice(0, 10);

const EMPTY_AD = {
  companyName: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  destinationUrl: "",
  imageUrl: "",
  displayDurationMs: DEFAULT_DURATION_MS,
  isActive: true,
  sortOrder: 0,
  notes: "",
};

const EMPTY_PAYMENT = {
  amount: "",
  date: todayInput(),
  method: "EFT",
  status: "RECEIVED",
  reference: "",
  note: "",
};

// What an advertiser has paid, split the same way the revenue cards split it:
// RECEIVED is money in, INVOICED is money still owed.
function totalsFor(ad) {
  let paid = 0;
  let outstanding = 0;
  for (const p of ad.payments || []) {
    const amount = Number(p.amount) || 0;
    if (p.status === "INVOICED") outstanding += amount;
    else paid += amount;
  }
  return { paid, outstanding, count: (ad.payments || []).length };
}

const seconds = (ms) => `${Math.round((Number(ms) || 0) / 100) / 10} second${Number(ms) === 1000 ? "" : "s"}`;

export default function AdManager() {
  const { data, loading, error, reload } = useFetch("/api/ads");
  const ads = data?.ads || [];
  const revenue = data?.revenue || null;

  const [editing, setEditing] = useState(null); // null | { id } | "new"
  const [form, setForm] = useState(EMPTY_AD);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [progress, setProgress] = useState(null);
  const [payFor, setPayFor] = useState(null);
  const [payForm, setPayForm] = useState(EMPTY_PAYMENT);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [formError, setFormError] = useState(null);
  const fileRef = useRef(null);

  const recentPayments = useMemo(() => {
    const rows = [];
    for (const ad of ads) {
      for (const p of ad.payments || []) rows.push({ ...p, companyName: ad.companyName });
    }
    return rows.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 15);
  }, [ads]);

  function openAdd() {
    setForm(EMPTY_AD);
    setFile(null);
    setPreview(null);
    setFormError(null);
    setEditing("new");
  }

  function openEdit(ad) {
    setForm({
      companyName: ad.companyName || "",
      contactName: ad.contactName || "",
      contactPhone: ad.contactPhone || "",
      contactEmail: ad.contactEmail || "",
      destinationUrl: ad.destinationUrl || "",
      imageUrl: ad.imageUrl || "",
      displayDurationMs: ad.displayDurationMs ?? DEFAULT_DURATION_MS,
      isActive: !!ad.isActive,
      sortOrder: ad.sortOrder ?? 0,
      notes: ad.notes || "",
    });
    setFile(null);
    setPreview(null);
    setFormError(null);
    setEditing({ id: ad.id });
  }

  function closeAdModal() {
    if (busy) return;
    if (preview) URL.revokeObjectURL(preview);
    if (fileRef.current) fileRef.current.value = "";
    setEditing(null);
    setFile(null);
    setPreview(null);
    setProgress(null);
  }

  function onPick(e) {
    const f = e.target.files?.[0] || null;
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
    setFormError(null);
  }

  async function saveAd(e) {
    e.preventDefault();
    setFormError(null);
    const duration = Number(form.displayDurationMs);
    if (!form.companyName.trim()) {
      setFormError("Company name is required.");
      return;
    }
    if (!Number.isInteger(duration) || duration < MIN_DURATION_MS || duration > MAX_DURATION_MS) {
      setFormError(`Display duration must be a whole number of milliseconds between ${MIN_DURATION_MS} and ${MAX_DURATION_MS}.`);
      return;
    }
    if (file && !file.type.startsWith("image/")) {
      setFormError("The selected file is not an image.");
      return;
    }

    setBusy(true);
    try {
      let imageUrl = form.imageUrl;
      if (file) {
        // The presigned flow signs an exact pathname, so build a unique one.
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
        const pathname = `ads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
        const uploaded = await uploadPresigned(pathname, file, {
          access: "public",
          handleUploadUrl: "/api/ads/upload",
          onUploadProgress: (p) => setProgress(p.percentage),
        });
        imageUrl = uploaded.url;
      }

      const payload = { ...form, imageUrl, displayDurationMs: duration, sortOrder: Number(form.sortOrder) || 0 };
      if (editing === "new") await api.post("/api/ads", payload);
      else await api.put(`/api/ads/${editing.id}`, payload);

      closeAdModal();
      setNotice(editing === "new" ? "Advertisement added." : "Advertisement updated.");
      reload();
    } catch (err) {
      setFormError(err.message || "Could not save the advertisement.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  async function toggleActive(ad) {
    setNotice(null);
    try {
      await api.put(`/api/ads/${ad.id}`, { ...ad, isActive: !ad.isActive });
      setNotice(ad.isActive ? `“${ad.companyName}” paused.` : `“${ad.companyName}” is live again.`);
      reload();
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function removeAd(ad) {
    if (!window.confirm(`Delete the “${ad.companyName}” advertisement? Its payment history goes with it. This cannot be undone.`)) return;
    setNotice(null);
    try {
      await api.del(`/api/ads/${ad.id}`);
      setNotice("Advertisement deleted.");
      reload();
    } catch (err) {
      setFormError(err.message);
    }
  }

  function openPayment(ad) {
    setPayForm({ ...EMPTY_PAYMENT, date: todayInput() });
    setFormError(null);
    setPayFor(ad);
  }

  async function savePayment(e) {
    e.preventDefault();
    setFormError(null);
    const amount = Number(payForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Enter an amount greater than zero.");
      return;
    }
    setBusy(true);
    try {
      await api.post(`/api/ads/${payFor.id}/payments`, payForm);
      setPayFor(null);
      setNotice(`Payment of ${zar(amount)} recorded for ${payFor.companyName}.`);
      reload();
    } catch (err) {
      setFormError(err.message || "Could not record the payment.");
    } finally {
      setBusy(false);
    }
  }

  async function removePayment(payment) {
    if (!window.confirm("Delete this payment record? The revenue figures will change immediately.")) return;
    setNotice(null);
    try {
      await api.del(`/api/ads/payments/${payment.id}`);
      setNotice("Payment record deleted.");
      reload();
    } catch (err) {
      setFormError(err.message);
    }
  }

  if (loading && !data) return <LoadingBlock label="Loading the Ad Manager…" />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <div>
      <PageHeader
        title="Ad Manager"
        subtitle="Advertisements sold on the Trust's platforms, and the revenue each advertiser brings in. Only the software owner can open this module."
        actions={<button className="btn-primary" onClick={openAdd}>+ New Advertisement</button>}
      />

      {notice && <div className="mb-4"><Alert type="success" onClose={() => setNotice(null)}>{notice}</Alert></div>}
      {formError && !editing && !payFor && <div className="mb-4"><Alert type="error" onClose={() => setFormError(null)}>{formError}</Alert></div>}

      {/* ---------- Revenue / cash flow ---------- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="Received" value={zar(revenue?.received)} sub="Money actually in the bank" />
        <StatCard label="Outstanding" value={zar(revenue?.outstanding)} sub="Invoiced, not yet paid" accent="amber" />
        <StatCard label="This month" value={zar(revenue?.thisMonth)} sub={`Last month ${zar(revenue?.lastMonth)}`} accent="sunset" />
        <StatCard label="Booked all-time" value={zar(revenue?.booked)} sub={`${revenue?.payments || 0} payment records`} accent="trust" />
      </div>

      {/* ---------- Advertisements ---------- */}
      <h2 className="text-lg font-bold text-forest-900 mb-3">
        Advertisements <span className="text-sm font-normal text-gray-500">({ads.length})</span>
      </h2>

      {ads.length === 0 ? (
        <div className="card mb-8">
          <EmptyState
            title="No advertisements yet"
            message="Add the first advertiser: their creative, where it should send visitors, and how long it stays on screen."
            action={<button className="btn-primary" onClick={openAdd}>+ New Advertisement</button>}
          />
        </div>
      ) : (
        <div className="card overflow-x-auto mb-8">
          <table className="table-base">
            <thead>
              <tr>
                <th>Creative</th>
                <th>Advertiser</th>
                <th>Contact</th>
                <th>Destination</th>
                <th>Display</th>
                <th className="text-right">Paid</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {ads.map((ad) => {
                const t = totalsFor(ad);
                return (
                  <tr key={ad.id}>
                    <td>
                      {ad.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ad.imageUrl} alt={`${ad.companyName} creative`} className="h-12 w-20 rounded object-cover" loading="lazy" />
                      ) : (
                        <span className="text-xs text-gray-400">No image</span>
                      )}
                    </td>
                    <td>
                      <p className="font-semibold text-sm text-gray-900">{ad.companyName}</p>
                      {ad.notes && <p className="text-xs text-gray-500 mt-0.5 max-w-[16rem] truncate" title={ad.notes}>{ad.notes}</p>}
                    </td>
                    <td className="text-xs text-gray-600">
                      {ad.contactName && <p>{ad.contactName}</p>}
                      {ad.contactPhone && <p>{ad.contactPhone}</p>}
                      {ad.contactEmail && <p className="truncate max-w-[12rem]">{ad.contactEmail}</p>}
                      {!ad.contactName && !ad.contactPhone && !ad.contactEmail && <span className="text-gray-400">—</span>}
                    </td>
                    <td className="text-xs">
                      {ad.destinationUrl ? (
                        <a href={ad.destinationUrl} target="_blank" rel="noopener noreferrer" className="text-forest-700 hover:underline break-all">
                          {ad.destinationUrl.replace(/^https?:\/\//, "")}
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="text-xs text-gray-600 whitespace-nowrap">
                      {ad.displayDurationMs} ms
                      <span className="block text-gray-400">{seconds(ad.displayDurationMs)}</span>
                    </td>
                    <td className="text-right text-sm whitespace-nowrap">
                      {zar(t.paid)}
                      {t.outstanding > 0 && <span className="block text-xs text-amber-600">{zar(t.outstanding)} owed</span>}
                    </td>
                    <td>
                      <span className={`pill ${ad.isActive ? "pill-active" : "pill-closed"}`}>{ad.isActive ? "Live" : "Paused"}</span>
                    </td>
                    <td>
                      <div className="flex flex-wrap justify-end gap-2">
                        <button className="btn-outline btn-sm" onClick={() => openPayment(ad)}>Record payment</button>
                        <button className="btn-ghost btn-sm" onClick={() => openEdit(ad)}>Edit</button>
                        <button className="btn-ghost btn-sm" onClick={() => toggleActive(ad)}>{ad.isActive ? "Pause" : "Resume"}</button>
                        <button className="btn-danger btn-sm" onClick={() => removeAd(ad)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------- Cash flow detail ---------- */}
      <h2 className="text-lg font-bold text-forest-900 mb-3">
        Recent ad payments <span className="text-sm font-normal text-gray-500">({revenue?.payments || 0} total)</span>
      </h2>

      {recentPayments.length === 0 ? (
        <div className="card p-8 text-center text-sm text-gray-500 mb-8">
          No ad revenue recorded yet. Use “Record payment” on an advertisement above.
        </div>
      ) : (
        <div className="card overflow-x-auto mb-8">
          <table className="table-base">
            <thead>
              <tr>
                <th>Date</th>
                <th>Advertiser</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Status</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.map((p) => (
                <tr key={p.id}>
                  <td className="text-sm whitespace-nowrap" title={dateTimeFmt(p.date)}>{dateFmt(p.date)}</td>
                  <td className="text-sm font-medium text-gray-900">{p.companyName}</td>
                  <td className="text-sm text-gray-600">{METHODS.find((m) => m.value === p.method)?.label || p.method}</td>
                  <td className="text-xs text-gray-500">{p.reference || p.note || "—"}</td>
                  <td>
                    <span className={`pill ${p.status === "RECEIVED" ? "pill-active" : "pill-pending"}`}>
                      {p.status === "RECEIVED" ? "Received" : "Invoiced"}
                    </span>
                  </td>
                  <td className="text-right text-sm font-semibold whitespace-nowrap">{zar(p.amount)}</td>
                  <td className="text-right">
                    <button className="btn-danger btn-sm" onClick={() => removePayment(p)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------- Add / edit advertisement ---------- */}
      <Modal open={!!editing} onClose={closeAdModal} title={editing === "new" ? "New advertisement" : "Edit advertisement"} wide>
        <form onSubmit={saveAd} className="grid gap-4">
          {formError && <Alert type="error" onClose={() => setFormError(null)}>{formError}</Alert>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company name" required>
              <input className="input" value={form.companyName} maxLength={160} required
                onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} />
            </Field>
            <Field label="Contact person">
              <input className="input" value={form.contactName} maxLength={160}
                onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} />
            </Field>
            <Field label="Contact phone">
              <input className="input" value={form.contactPhone} maxLength={40}
                onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))} />
            </Field>
            <Field label="Contact email">
              <input className="input" type="email" value={form.contactEmail} maxLength={200}
                onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} />
            </Field>
          </div>

          <Field label="Destination URL">
            <input className="input" type="url" placeholder="https://" value={form.destinationUrl}
              onChange={(e) => setForm((f) => ({ ...f, destinationUrl: e.target.value }))} />
            <p className="mt-1 text-xs text-gray-500">Where a visitor goes when they click the advertisement.</p>
          </Field>

          <Field label="Advertisement image">
            <input ref={fileRef} className="input" type="file" accept="image/*" onChange={onPick} />
            <p className="mt-1 text-xs text-gray-500">
              JPEG, PNG, WebP or GIF, up to 20 MB. Uploaded straight to Vercel Blob from your browser.
              {form.imageUrl && !file ? " Leave empty to keep the current image." : ""}
            </p>
          </Field>

          {(preview || (!file && form.imageUrl)) && (
            <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview || form.imageUrl} alt="Creative preview" className="max-h-48 w-auto object-contain" />
            </div>
          )}

          {busy && progress != null && (
            <div>
              <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                <div className="h-full bg-forest-600 transition-all" style={{ width: `${Math.round(progress)}%` }} />
              </div>
              <p className="mt-1 text-xs text-gray-500">Uploading… {Math.round(progress)}%</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Display duration (ms)">
              <input className="input" type="number" min={MIN_DURATION_MS} max={MAX_DURATION_MS} step={100}
                value={form.displayDurationMs}
                onChange={(e) => setForm((f) => ({ ...f, displayDurationMs: e.target.value }))} />
              <p className="mt-1 text-xs text-gray-500">Shown for {seconds(form.displayDurationMs)}. Default {DEFAULT_DURATION_MS} ms.</p>
            </Field>
            <Field label="Display order">
              <input className="input" type="number" min={0} step={1} value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} />
              <p className="mt-1 text-xs text-gray-500">Lower numbers rotate first.</p>
            </Field>
            <Field label="Status">
              <label className="flex items-center gap-2 text-sm text-gray-700 pt-2">
                <input type="checkbox" checked={!!form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
                Live (rotating)
              </label>
            </Field>
          </div>

          <Field label="Notes">
            <textarea className="input" rows={2} maxLength={1000} value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </Field>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" className="btn-ghost" onClick={closeAdModal} disabled={busy}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? "Saving…" : editing === "new" ? "Add Advertisement" : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ---------- Record a payment ---------- */}
      <Modal open={!!payFor} onClose={() => !busy && setPayFor(null)} title={`Record payment — ${payFor?.companyName || ""}`}>
        <form onSubmit={savePayment} className="grid gap-4">
          {formError && <Alert type="error" onClose={() => setFormError(null)}>{formError}</Alert>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount (R)" required>
              <input className="input" type="number" min="0.01" step="0.01" required value={payForm.amount}
                onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))} />
            </Field>
            <Field label="Date" required>
              <input className="input" type="date" required value={payForm.date}
                onChange={(e) => setPayForm((f) => ({ ...f, date: e.target.value }))} />
            </Field>
            <Field label="Method">
              <select className="input" value={payForm.method} onChange={(e) => setPayForm((f) => ({ ...f, method: e.target.value }))}>
                {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className="input" value={payForm.status} onChange={(e) => setPayForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="RECEIVED">Received</option>
                <option value="INVOICED">Invoiced (still owed)</option>
              </select>
            </Field>
          </div>

          <Field label="Reference">
            <input className="input" maxLength={120} value={payForm.reference}
              onChange={(e) => setPayForm((f) => ({ ...f, reference: e.target.value }))} />
          </Field>
          <Field label="Note">
            <input className="input" maxLength={500} value={payForm.note}
              onChange={(e) => setPayForm((f) => ({ ...f, note: e.target.value }))} />
          </Field>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setPayFor(null)} disabled={busy}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Record Payment"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
