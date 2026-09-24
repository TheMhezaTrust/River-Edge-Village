"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/api-client";
import { useFetch, PageHeader, LoadingBlock, ErrorBlock } from "@/components/ws/common";
import { Modal, Field, StatusPill, Alert } from "@/components/ui";
import { dateFmt } from "@/lib/format";
import { can } from "@/lib/roles";

const STATUSES = ["PENDING", "IN_PROGRESS", "APPROVED", "NO_OBJECTION", "REJECTED"];
const METHODS = ["EMAIL", "PHONE", "MEETING", "LETTER"];
const BAR_COLORS = {
  PENDING: "bg-amber-400",
  IN_PROGRESS: "bg-blue-500",
  APPROVED: "bg-forest-600",
  NO_OBJECTION: "bg-teal-500",
  REJECTED: "bg-red-500",
};

const EMPTY_DEPT = { name: "", contactPerson: "", phone: "", email: "", status: "PENDING", notes: "", followUpDate: "" };
const EMPTY_LOG = { date: new Date().toISOString().slice(0, 10), method: "EMAIL", summary: "", nextSteps: "" };

export default function DepartmentsPage() {
  const { data: departments, loading, error, reload } = useFetch("/api/departments");
  const { data: me } = useFetch("/api/auth/me");
  const canManage = can(me, "departments:manage");

  const [deptModal, setDeptModal] = useState(null); // { mode: "add"|"edit", dept? }
  const [deptForm, setDeptForm] = useState(EMPTY_DEPT);
  const [logFor, setLogFor] = useState(null); // department being logged
  const [logForm, setLogForm] = useState(EMPTY_LOG);
  const [expanded, setExpanded] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const setDept = (k) => (e) => setDeptForm((f) => ({ ...f, [k]: e.target.value }));
  const setLog = (k) => (e) => setLogForm((f) => ({ ...f, [k]: e.target.value }));

  const counts = useMemo(() => {
    const c = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    (departments || []).forEach((d) => { if (c[d.status] != null) c[d.status] += 1; });
    return c;
  }, [departments]);

  const total = departments?.length || 0;
  const today = new Date().toISOString().slice(0, 10);

  function openAdd() {
    setDeptForm(EMPTY_DEPT);
    setFormError(null);
    setDeptModal({ mode: "add" });
  }

  function openEdit(d) {
    setDeptForm({
      name: d.name || "",
      contactPerson: d.contactPerson || "",
      phone: d.phone || "",
      email: d.email || "",
      status: d.status || "PENDING",
      notes: d.notes || "",
      followUpDate: d.followUpDate ? String(d.followUpDate).slice(0, 10) : "",
    });
    setFormError(null);
    setDeptModal({ mode: "edit", dept: d });
  }

  function openLog(d) {
    setLogForm({ ...EMPTY_LOG, date: today });
    setFormError(null);
    setLogFor(d);
  }

  async function submitDept(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const body = { ...deptForm, followUpDate: deptForm.followUpDate || null };
      if (deptModal.mode === "add") await api.post("/api/departments", body);
      else await api.put(`/api/departments/${deptModal.dept.id}`, body);
      setDeptModal(null);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function submitLog(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.post(`/api/departments/${logFor.id}/logs`, logForm);
      setLogFor(null);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading && !departments) return <LoadingBlock label="Loading departments…" />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <div>
      <PageHeader
        title="Department Engagement"
        subtitle={`${total} government departments & agencies · track approvals and communications`}
        actions={canManage && <button className="btn-primary btn-sm" onClick={openAdd}>+ Add Department</button>}
      />

      {/* Approval dashboard strip */}
      <div className="card p-4 mb-4">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {STATUSES.map((s) => (
            <div key={s}>
              <div className="flex items-center justify-between text-xs font-semibold text-gray-600 mb-1">
                <StatusPill status={s} />
                <span>{counts[s]}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className={`h-full ${BAR_COLORS[s]}`} style={{ width: total ? `${(counts[s] / total) * 100}%` : "0%" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {departments.map((d) => {
          const lastLog = d.logs?.[0];
          const overdue = d.followUpDate && String(d.followUpDate).slice(0, 10) < today && !["APPROVED", "NO_OBJECTION", "REJECTED"].includes(d.status);
          const isOpen = !!expanded[d.id];
          return (
            <div key={d.id} className="card p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-forest-900">{d.name}</h3>
                <StatusPill status={d.status} />
              </div>
              <div className="text-sm text-gray-600 space-y-0.5">
                {d.contactPerson && <p>Contact: <span className="font-medium text-gray-800">{d.contactPerson}</span></p>}
                {d.phone && <p>{d.phone}</p>}
                {d.email && <p className="break-all">{d.email}</p>}
              </div>
              {d.notes && <p className="text-sm text-gray-500 italic">{d.notes}</p>}
              {d.followUpDate && (
                <p className={`text-sm font-semibold ${overdue ? "text-red-600" : "text-gray-700"}`}>
                  Follow-up: {dateFmt(d.followUpDate)}{overdue ? " (overdue)" : ""}
                </p>
              )}
              {lastLog && (
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs text-gray-600">
                  <p className="font-semibold text-gray-700 mb-1">Last contact · {dateFmt(lastLog.date)} · {lastLog.method}</p>
                  <p>{lastLog.summary}</p>
                  {lastLog.nextSteps && <p className="mt-1 text-gray-500">Next: {lastLog.nextSteps}</p>}
                </div>
              )}
              <div className="mt-auto flex flex-wrap gap-2 pt-1">
                {canManage && (
                  <>
                    <button className="btn-outline btn-sm" onClick={() => openLog(d)}>Log Communication</button>
                    <button className="btn-ghost btn-sm" onClick={() => openEdit(d)}>Edit</button>
                  </>
                )}
                {(d.logs?.length || 0) > 0 && (
                  <button className="btn-ghost btn-sm" onClick={() => setExpanded((e) => ({ ...e, [d.id]: !e[d.id] }))}>
                    {isOpen ? "Hide history" : `History (${d.logs.length})`}
                  </button>
                )}
              </div>
              {isOpen && (
                <ul className="space-y-2 border-t border-gray-200 pt-3 max-h-56 overflow-y-auto">
                  {d.logs.map((l) => (
                    <li key={l.id} className="text-xs text-gray-600">
                      <p className="font-semibold text-gray-700">{dateFmt(l.date)} · {l.method}</p>
                      <p>{l.summary}</p>
                      {l.nextSteps && <p className="text-gray-500">Next: {l.nextSteps}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
        {departments.length === 0 && (
          <div className="card p-10 text-center text-gray-500 md:col-span-2 xl:col-span-3">No departments recorded yet.</div>
        )}
      </div>

      {/* Add / Edit department modal */}
      <Modal open={!!deptModal} onClose={() => setDeptModal(null)} title={deptModal?.mode === "add" ? "Add Department" : "Edit Department"} wide>
        {formError && !logFor && <div className="mb-4"><Alert type="error">{formError}</Alert></div>}
        <form onSubmit={submitDept} className="grid gap-4 sm:grid-cols-2">
          <Field label="Department Name" required className="sm:col-span-2">
            <input className="input" required value={deptForm.name} onChange={setDept("name")} />
          </Field>
          <Field label="Contact Person"><input className="input" value={deptForm.contactPerson} onChange={setDept("contactPerson")} /></Field>
          <Field label="Status">
            <select className="input" value={deptForm.status} onChange={setDept("status")}>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
          </Field>
          <Field label="Phone"><input className="input" value={deptForm.phone} onChange={setDept("phone")} /></Field>
          <Field label="Email"><input className="input" type="email" value={deptForm.email} onChange={setDept("email")} /></Field>
          <Field label="Follow-up Date"><input className="input" type="date" value={deptForm.followUpDate} onChange={setDept("followUpDate")} /></Field>
          <Field label="Notes" className="sm:col-span-2"><textarea className="input" rows={3} value={deptForm.notes} onChange={setDept("notes")} /></Field>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setDeptModal(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : deptModal?.mode === "add" ? "Add Department" : "Save Changes"}</button>
          </div>
        </form>
      </Modal>

      {/* Log communication modal */}
      <Modal open={!!logFor} onClose={() => setLogFor(null)} title={`Log Communication · ${logFor?.name || ""}`}>
        {formError && !deptModal && <div className="mb-4"><Alert type="error">{formError}</Alert></div>}
        <form onSubmit={submitLog} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" required><input className="input" type="date" required value={logForm.date} onChange={setLog("date")} /></Field>
            <Field label="Method" required>
              <select className="input" value={logForm.method} onChange={setLog("method")}>
                {METHODS.map((m) => <option key={m} value={m}>{m.charAt(0) + m.slice(1).toLowerCase()}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Summary" required><textarea className="input" rows={3} required value={logForm.summary} onChange={setLog("summary")} /></Field>
          <Field label="Next Steps"><textarea className="input" rows={2} value={logForm.nextSteps} onChange={setLog("nextSteps")} /></Field>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setLogFor(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save Log"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
