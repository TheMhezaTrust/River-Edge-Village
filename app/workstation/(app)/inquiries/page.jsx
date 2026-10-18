"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { useFetch, PageHeader, LoadingBlock, ErrorBlock, ConfirmButton } from "@/components/ws/common";
import { usePermissions, ReadOnlyNote } from "@/components/ws/permissions";
import { Modal, Field, StatusPill, Alert } from "@/components/ui";
import { zar, dateFmt, dateTimeFmt } from "@/lib/format";

const STATUSES = ["NEW", "CONTACTED", "CONVERTED", "CLOSED"];
const EMPTY = { name: "", email: "", phone: "", message: "", source: "PHONE", plotId: "" };
const EMPTY_CONVERT = { fullName: "", idNumber: "", phone: "", purchasePrice: "", paymentPlan: "", status: "RESERVED" };
const DEFAULT_SUBJECT = "Re: your inquiry to The Mheza Trust";
const HISTORY_ERROR = "Communication history could not be loaded.";

export default function InquiriesPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading inquiries…" />}>
      <InquiriesInner />
    </Suspense>
  );
}

function InquiriesInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { can } = usePermissions();
  const canManage = can("inquiries:manage");
  const canConvert = can("members:manage");
  const { data: inquiries, loading, error, reload } = useFetch("/api/inquiries");
  const { data: plots } = useFetch("/api/plots");
  const [users, setUsers] = useState(null);

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(canManage && searchParams.get("new") === "1");
  const [form, setForm] = useState(EMPTY);
  const [viewing, setViewing] = useState(null);
  const [convertFor, setConvertFor] = useState(null);
  const [convertForm, setConvertForm] = useState(EMPTY_CONVERT);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  // Detail modal: the full inquiry (including its communication history) is
  // fetched separately, because the list endpoint does not carry reply bodies.
  const [detail, setDetail] = useState(null);
  const [historyError, setHistoryError] = useState(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyForm, setReplyForm] = useState({ subject: DEFAULT_SUBJECT, message: "" });
  const [sending, setSending] = useState(false);
  const [replyNotice, setReplyNotice] = useState(null);
  const [replyError, setReplyError] = useState(null);

  useEffect(() => {
    if (!canManage) return;
    api.get("/api/admin/users").then(setUsers).catch(() => setUsers(null));
  }, [canManage]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setConv = (k) => (e) => setConvertForm((f) => ({ ...f, [k]: e.target.value }));

  const filtered = useMemo(() => {
    if (!inquiries) return [];
    let list = inquiries;
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter((i) => [i.name, i.email, i.phone, i.plot?.number, i.message].some((v) => (v || "").toLowerCase().includes(s)));
    }
    if (statusFilter !== "ALL") list = list.filter((i) => i.status === statusFilter);
    return list;
  }, [inquiries, q, statusFilter]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    (inquiries || []).forEach((i) => { if (c[i.status] != null) c[i.status] += 1; });
    return c;
  }, [inquiries]);

  const total = inquiries?.length || 0;
  const conversionRate = total ? Math.round((counts.CONVERTED / total) * 100) : 0;
  const contactedRate = total ? Math.round(((counts.CONTACTED + counts.CONVERTED) / total) * 100) : 0;

  // Read the open inquiry back out of the reloaded list so the modal reflects a
  // status change (e.g. New → Contacted after a reply) without closing it.
  const current = viewing ? inquiries?.find((i) => i.id === viewing.id) || viewing : null;
  const viewingId = viewing?.id;

  useEffect(() => {
    if (!viewingId) {
      setDetail(null);
      return;
    }
    let alive = true;
    setHistoryError(null);
    api
      .get(`/api/inquiries/${viewingId}`)
      .then((d) => { if (alive) setDetail(d); })
      .catch(() => { if (alive) { setDetail(null); setHistoryError(HISTORY_ERROR); } });
    return () => { alive = false; };
  }, [viewingId]);

  async function loadDetail(id) {
    setHistoryError(null);
    try {
      setDetail(await api.get(`/api/inquiries/${id}`));
    } catch {
      setDetail(null);
      setHistoryError(HISTORY_ERROR);
    }
  }

  function closeView() {
    setViewing(null);
    setReplyOpen(false);
    setReplyNotice(null);
    setReplyError(null);
  }

  function openView(i) {
    setFormError(null);
    setReplyOpen(false);
    setReplyNotice(null);
    setReplyError(null);
    setViewing(i);
  }

  function openReply() {
    setReplyForm({ subject: DEFAULT_SUBJECT, message: "" });
    setReplyNotice(null);
    setReplyError(null);
    setReplyOpen(true);
  }

  async function submitReply(e) {
    e.preventDefault();
    setSending(true);
    setReplyError(null);
    setReplyNotice(null);
    try {
      const res = await api.post(`/api/inquiries/${current.id}/reply`, replyForm);
      setReplyOpen(false);
      setReplyNotice(
        res.status === "CONTACTED"
          ? `Email sent to ${res.to}. Status set to Contacted.`
          : `Email sent to ${res.to}.`
      );
      await Promise.all([loadDetail(current.id), reload()]);
    } catch (err) {
      setReplyError(err.message);
      // A failed send is recorded in the history too, so refresh it and let the
      // member of staff see what the provider reported.
      await loadDetail(current.id);
    } finally {
      setSending(false);
    }
  }

  async function putInquiry(id, patch) {
    try {
      await api.put(`/api/inquiries/${id}`, patch);
      reload();
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.post("/api/inquiries", { ...form, plotId: form.plotId || null });
      setAddOpen(false);
      setForm(EMPTY);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function openConvert(i) {
    setConvertForm({ ...EMPTY_CONVERT, fullName: i.name, phone: i.phone });
    setFormError(null);
    setConvertFor(i);
  }

  async function submitConvert(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const body = { ...convertForm };
      if (!body.purchasePrice) delete body.purchasePrice;
      const member = await api.post(`/api/inquiries/${convertFor.id}/convert`, body);
      setConvertFor(null);
      router.push(`/workstation/members/${member.id}`);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading && !inquiries) return <LoadingBlock label="Loading inquiries…" />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <div>
      <PageHeader
        title="Inquiry Management"
        subtitle={`${total} inquiries · qualify, assign, follow up and convert to members`}
        actions={canManage ? <button className="btn-primary btn-sm" onClick={() => setAddOpen(true)}>+ Add Inquiry</button> : undefined}
      />

      {!canManage && <div className="mb-4"><ReadOnlyNote label="all inquiries" /></div>}

      {formError && !addOpen && !convertFor && (
        <div className="mb-4"><Alert type="error" onClose={() => setFormError(null)}>{formError}</Alert></div>
      )}

      {/* Stat chips + filters */}
      <div className="card p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex flex-wrap gap-2">
          {["ALL", ...STATUSES].map((s) => (
            <button
              key={s}
              className={`btn-sm rounded-full px-3 border ${statusFilter === s ? "btn-primary" : "btn-outline"}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === "ALL" ? `All (${total})` : `${s.charAt(0) + s.slice(1).toLowerCase()} (${counts[s]})`}
            </button>
          ))}
        </div>
        <input className="input max-w-xs ml-auto" placeholder="Search name, email, phone, plot…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search inquiries" />
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Name</th><th>Contact</th><th>Plot</th><th>Source</th><th>Status</th><th>Assignee</th><th>Received</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id}>
                <td className="font-semibold text-forest-700">{i.name}</td>
                <td className="text-xs text-gray-600">{i.phone}<br />{i.email}</td>
                <td>{i.plot ? `Plot ${i.plot.number}` : "-"}</td>
                <td className="text-xs">{i.source}</td>
                <td>
                  {canManage ? (
                    <select
                      className="input btn-sm py-0.5 text-xs"
                      value={i.status}
                      onChange={(e) => putInquiry(i.id, { status: e.target.value })}
                      aria-label={`Status for ${i.name}`}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : null}
                  <div className={canManage ? "mt-1" : ""}><StatusPill status={i.status} /></div>
                </td>
                <td>
                  {canManage && users ? (
                    <select
                      className="input btn-sm py-0.5 text-xs"
                      value={i.assignedTo || ""}
                      onChange={(e) => putInquiry(i.id, { assignedTo: e.target.value })}
                      aria-label={`Assignee for ${i.name}`}
                    >
                      <option value="">Unassigned</option>
                      {users.filter((u) => u.isActive !== false).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  ) : (
                    <span className="text-xs text-gray-500">{i.assignee?.name || "Unassigned"}</span>
                  )}
                </td>
                <td className="text-xs whitespace-nowrap">{dateFmt(i.createdAt)}</td>
                <td className="whitespace-nowrap">
                  <button className="btn-ghost btn-sm" onClick={() => openView(i)}>View</button>
                  {canConvert && i.status !== "CONVERTED" && i.status !== "CLOSED" && (
                    <button className="btn-ghost btn-sm text-forest-700" onClick={() => openConvert(i)}>Convert</button>
                  )}
                  {canManage && (
                    <ConfirmButton
                      label="Delete"
                      className="btn-ghost btn-sm text-red-600"
                      confirmText={`Delete inquiry from ${i.name}?`}
                      onConfirm={async () => { await api.del(`/api/inquiries/${i.id}`); reload(); }}
                    />
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center text-gray-500 py-10">No inquiries match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Reports strip */}
      <div className="grid gap-4 sm:grid-cols-3 mt-4">
        <div className="card p-4 text-center">
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Total Inquiries</p>
          <p className="text-2xl font-bold text-forest-700">{total}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Conversion Rate</p>
          <p className="text-2xl font-bold text-forest-700">{conversionRate}%</p>
          <p className="text-xs text-gray-500">{counts.CONVERTED} converted</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Contacted</p>
          <p className="text-2xl font-bold text-amber-600">{contactedRate}%</p>
          <p className="text-xs text-gray-500">{counts.CONTACTED + counts.CONVERTED} engaged</p>
        </div>
      </div>

      {/* Add inquiry modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Inquiry">
        {formError && <div className="mb-4"><Alert type="error">{formError}</Alert></div>}
        <form onSubmit={submit} className="grid gap-4">
          <Field label="Full Name" required><input className="input" required value={form.name} onChange={set("name")} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email"><input className="input" type="email" value={form.email} onChange={set("email")} /></Field>
            <Field label="Phone"><input className="input" value={form.phone} onChange={set("phone")} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Source">
              <select className="input" value={form.source} onChange={set("source")}>
                {["PHONE", "EMAIL", "WEBSITE", "WALK_IN", "REFERRAL", "SOCIAL_MEDIA"].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
              </select>
            </Field>
            <Field label="Interested Plot">
              <select className="input" value={form.plotId} onChange={set("plotId")}>
                <option value="">- None -</option>
                {plots?.filter((p) => p.status === "AVAILABLE").map((p) => <option key={p.id} value={p.id}>Plot {p.number} (Block {p.block})</option>)}
              </select>
            </Field>
          </div>
          <Field label="Message"><textarea className="input" rows={3} value={form.message} onChange={set("message")} /></Field>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setAddOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Add Inquiry"}</button>
          </div>
        </form>
      </Modal>

      {/* View modal */}
      <Modal open={!!current} onClose={closeView} title={`Inquiry · ${current?.name || ""}`} wide>
        {current && (
          <div className="space-y-4">
            {replyNotice && <Alert type="success" onClose={() => setReplyNotice(null)}>{replyNotice}</Alert>}
            {replyError && <Alert type="error" onClose={() => setReplyError(null)}>{replyError}</Alert>}

            <div className="flex items-center gap-2">
              <StatusPill status={current.status} />
              <span className="text-xs text-gray-500">Received {dateTimeFmt(current.createdAt)}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <p><span className="font-semibold text-gray-700">Email:</span> {current.email || "-"}</p>
              <p><span className="font-semibold text-gray-700">Phone:</span> {current.phone || "-"}</p>
              <p><span className="font-semibold text-gray-700">Plot:</span> {current.plot ? `Plot ${current.plot.number}` : "-"}</p>
              <p><span className="font-semibold text-gray-700">Source:</span> {current.source}</p>
              <p><span className="font-semibold text-gray-700">Assignee:</span> {current.assignee?.name || "Unassigned"}</p>
              <p><span className="font-semibold text-gray-700">Follow-up:</span> {dateFmt(current.followUpDate)}</p>
            </div>
            {current.message && (
              <div>
                <p className="label">Message</p>
                <p className="text-sm text-gray-700 rounded-lg bg-gray-50 border border-gray-200 p-3">{current.message}</p>
              </div>
            )}
            <div>
              <p className="label">Internal Notes</p>
              <textarea
                className="input"
                rows={3}
                defaultValue={current.notes || ""}
                placeholder={canManage ? "Add notes visible to staff only…" : "No notes."}
                readOnly={!canManage}
                onBlur={(e) => {
                  if (canManage && e.target.value !== (current.notes || "")) putInquiry(current.id, { notes: e.target.value });
                }}
              />
            </div>
            {canManage && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Follow-up Date">
                  <input
                    className="input"
                    type="date"
                    defaultValue={current.followUpDate ? String(current.followUpDate).slice(0, 10) : ""}
                    onChange={(e) => putInquiry(current.id, { followUpDate: e.target.value || null })}
                  />
                </Field>
              </div>
            )}

            <div>
              <p className="label">Communication History</p>
              {historyError ? (
                <p className="text-xs text-red-600">{historyError}</p>
              ) : !detail ? (
                <p className="text-xs text-gray-500">Loading history…</p>
              ) : detail.replies?.length ? (
                <ul className="space-y-2">
                  {detail.replies.map((r) => (
                    <li key={r.id} className="rounded-lg border border-gray-200 p-3">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                        <StatusPill status={r.status} />
                        <span className="font-semibold text-gray-700">{r.subject}</span>
                        <span>to {r.toEmail}</span>
                        <span>· {dateTimeFmt(r.createdAt)}</span>
                        {r.sentBy?.name && <span>· sent by {r.sentBy.name}</span>}
                      </div>
                      <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{r.body}</p>
                      {r.error && <p className="mt-2 text-xs text-red-600">{r.error}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-500">No emails have been sent to this customer yet.</p>
              )}
            </div>

            {canManage && replyOpen && (
              <form onSubmit={submitReply} className="grid gap-3 rounded-lg border border-forest-200 bg-forest-50 p-4">
                <p className="text-xs text-gray-600">
                  Replying to <span className="font-semibold">{current.name}</span> at {current.email}.
                  A successful send moves this inquiry to Contacted.
                </p>
                <Field label="Subject">
                  <input
                    className="input"
                    value={replyForm.subject}
                    maxLength={200}
                    onChange={(e) => setReplyForm((f) => ({ ...f, subject: e.target.value }))}
                  />
                </Field>
                <Field label="Message" required>
                  <textarea
                    className="input"
                    rows={6}
                    required
                    maxLength={5000}
                    value={replyForm.message}
                    placeholder={`Dear ${current.name}, …`}
                    onChange={(e) => setReplyForm((f) => ({ ...f, message: e.target.value }))}
                  />
                </Field>
                <p className="text-xs text-gray-500">
                  The customer&apos;s reply is routed to the Trust inbox. Every send — including a failed one — is recorded in the history above.
                </p>
                <div className="flex justify-end gap-2">
                  <button type="button" className="btn-ghost" onClick={() => setReplyOpen(false)} disabled={sending}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={sending || !replyForm.message.trim()}>
                    {sending ? "Sending…" : "Send"}
                  </button>
                </div>
              </form>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              {canManage ? (
                current.email ? (
                  <button className="btn-primary btn-sm" onClick={() => (replyOpen ? setReplyOpen(false) : openReply())}>
                    {replyOpen ? "Hide reply box" : "Reply to Customer"}
                  </button>
                ) : (
                  <span className="text-xs text-gray-500">This inquiry has no email address, so a reply cannot be sent.</span>
                )
              ) : (
                <span />
              )}
              <button className="btn-outline" onClick={closeView}>Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Convert modal */}
      <Modal open={!!convertFor} onClose={() => setConvertFor(null)} title={`Convert ${convertFor?.name || ""} to Member`}>
        {formError && <div className="mb-4"><Alert type="error">{formError}</Alert></div>}
        <form onSubmit={submitConvert} className="grid gap-4">
          <Field label="Full Name" required><input className="input" required value={convertForm.fullName} onChange={setConv("fullName")} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ID Number"><input className="input" value={convertForm.idNumber} onChange={setConv("idNumber")} /></Field>
            <Field label="Phone"><input className="input" value={convertForm.phone} onChange={setConv("phone")} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Purchase Price">
              <input className="input" type="number" min="0" value={convertForm.purchasePrice} onChange={setConv("purchasePrice")} placeholder={convertFor?.plot ? String(convertFor.plot.price ?? "") : "75000"} />
            </Field>
            <Field label="Payment Plan">
              <select className="input" value={convertForm.paymentPlan} onChange={setConv("paymentPlan")}>
                <option value="">-</option><option value="FULL">Full payment</option><option value="PLAN_6">6 months</option><option value="PLAN_12">12 months</option><option value="PLAN_24">24 months</option>
              </select>
            </Field>
          </div>
          <Field label="Plot Status After Conversion">
            <select className="input" value={convertForm.status} onChange={setConv("status")}>
              <option value="RESERVED">Reserved</option><option value="SOLD">Sold</option>
            </select>
          </Field>
          {convertFor?.plot && <p className="text-xs text-gray-500">Plot {convertFor.plot.number} will be linked to the new member{convertFor.plot.price ? ` at ${zar(convertFor.plot.price)}` : ""}.</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setConvertFor(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Converting…" : "Convert to Member"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
