"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api-client";
import { useFetch, PageHeader, LoadingBlock, ErrorBlock, ConfirmButton } from "@/components/ws/common";
import { Modal, Field, StatusPill, Alert } from "@/components/ui";
import { dateFmt } from "@/lib/format";

const STATUSES = ["TODO", "IN_PROGRESS", "COMPLETED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const EMPTY = { title: "", description: "", assignedTo: "", dueDate: "", priority: "MEDIUM", status: "TODO" };
const todayStr = () => new Date().toISOString().slice(0, 10);

export default function TasksPage() {
  const { data: tasks, loading, error, reload } = useFetch("/api/tasks");
  const [users, setUsers] = useState(null);
  const [view, setView] = useState("list"); // list | kanban | calendar
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [myOnly, setMyOnly] = useState(false);
  const [taskModal, setTaskModal] = useState(null); // { mode: "add"|"edit", task? }
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [month, setMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });

  useEffect(() => {
    api.get("/api/admin/users").then(setUsers).catch(() => setUsers(null));
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // "My tasks" uses the server-side ?assignedTo=me filter via refetch
  const myTasksUrl = "/api/tasks?assignedTo=me";
  const { data: myTasks, reload: reloadMy } = useFetch(myTasksUrl);
  const source = myOnly ? myTasks : tasks;

  const filtered = useMemo(() => {
    if (!source) return [];
    let list = source;
    if (statusFilter !== "ALL") list = list.filter((t) => t.status === statusFilter);
    if (priorityFilter !== "ALL") list = list.filter((t) => t.priority === priorityFilter);
    return list;
  }, [source, statusFilter, priorityFilter]);

  const isOverdue = (t) => t.dueDate && String(t.dueDate).slice(0, 10) < todayStr() && t.status !== "COMPLETED";

  function refresh() { reload(); if (myOnly) reloadMy(); }

  function openAdd() {
    setForm({ ...EMPTY, dueDate: "" });
    setFormError(null);
    setTaskModal({ mode: "add" });
  }

  function openEdit(t) {
    setForm({
      title: t.title || "",
      description: t.description || "",
      assignedTo: t.assignedTo ? String(t.assignedTo) : "",
      dueDate: t.dueDate ? String(t.dueDate).slice(0, 10) : "",
      priority: t.priority || "MEDIUM",
      status: t.status || "TODO",
    });
    setFormError(null);
    setTaskModal({ mode: "edit", task: t });
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const body = { ...form, assignedTo: form.assignedTo || null, dueDate: form.dueDate || null };
      if (taskModal.mode === "add") await api.post("/api/tasks", body);
      else await api.put(`/api/tasks/${taskModal.task.id}`, body);
      setTaskModal(null);
      refresh();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function moveTask(id, status) {
    try {
      await api.put(`/api/tasks/${id}`, { status });
      refresh();
    } catch (err) {
      setFormError(err.message);
    }
  }

  // Calendar grid for the current month
  const calendar = useMemo(() => {
    const { y, m } = month;
    const first = new Date(y, m, 1);
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const startPad = (first.getDay() + 6) % 7; // Monday-first
    const cells = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ day: d, key, tasks: (source || []).filter((t) => t.dueDate && String(t.dueDate).slice(0, 10) === key) });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [month, source]);

  const monthLabel = new Date(month.y, month.m, 1).toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
  const shiftMonth = (delta) => setMonth(({ y, m }) => { const d = new Date(y, m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  if (loading && !tasks) return <LoadingBlock label="Loading tasks…" />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <div>
      <PageHeader
        title="Task Management"
        subtitle={`${source?.length ?? 0} tasks · list, kanban and calendar views`}
        actions={
          <>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              {["list", "kanban", "calendar"].map((v) => (
                <button key={v} className={`btn-sm px-3 ${view === v ? "btn-primary" : "btn-ghost"}`} onClick={() => setView(v)}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
            <button className="btn-primary btn-sm" onClick={openAdd}>+ Add Task</button>
          </>
        }
      />

      {formError && !taskModal && (
        <div className="mb-4"><Alert type="error" onClose={() => setFormError(null)}>{formError}</Alert></div>
      )}

      <div className="card p-4 mb-4 flex flex-wrap gap-3 items-center">
        <select className="input max-w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
          <option value="ALL">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
        <select className="input max-w-44" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} aria-label="Filter by priority">
          <option value="ALL">All priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={myOnly} onChange={(e) => setMyOnly(e.target.checked)} /> My tasks only
        </label>
        <span className="text-sm text-gray-500 ml-auto">{filtered.length} shown</span>
      </div>

      {view === "list" && (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr><th>Title</th><th>Status</th><th>Priority</th><th>Due</th><th>Assignee</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className={isOverdue(t) ? "bg-red-50" : undefined}>
                  <td>
                    <button className="font-semibold text-forest-700 hover:underline text-left" onClick={() => openEdit(t)}>{t.title}</button>
                    {t.description && <p className="text-xs text-gray-500 line-clamp-1">{t.description}</p>}
                  </td>
                  <td><StatusPill status={t.status} /></td>
                  <td><StatusPill status={t.priority} /></td>
                  <td className={`text-xs whitespace-nowrap ${isOverdue(t) ? "text-red-600 font-semibold" : ""}`}>
                    {t.dueDate ? dateFmt(t.dueDate) : "-"}{isOverdue(t) ? " (overdue)" : ""}
                  </td>
                  <td className="text-xs">{t.assignee?.name || "Unassigned"}</td>
                  <td className="whitespace-nowrap">
                    <button className="btn-ghost btn-sm" onClick={() => openEdit(t)}>Edit</button>
                    <ConfirmButton
                      label="Delete"
                      className="btn-ghost btn-sm text-red-600"
                      confirmText={`Delete task "${t.title}"?`}
                      onConfirm={async () => { await api.del(`/api/tasks/${t.id}`); refresh(); }}
                    />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="text-center text-gray-500 py-10">No tasks match your filters.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {view === "kanban" && (
        <div className="grid gap-4 md:grid-cols-3">
          {STATUSES.map((s) => (
            <div
              key={s}
              className="rounded-xl bg-gray-100 border border-gray-200 p-3 min-h-64"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = Number(e.dataTransfer.getData("text/plain") || dragId);
                setDragId(null);
                if (id) moveTask(id, s);
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <StatusPill status={s} />
                <span className="text-xs text-gray-500">{filtered.filter((t) => t.status === s).length}</span>
              </div>
              <div className="space-y-2">
                {filtered.filter((t) => t.status === s).map((t) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData("text/plain", String(t.id)); setDragId(t.id); }}
                    onDragEnd={() => setDragId(null)}
                    className={`card p-3 cursor-grab active:cursor-grabbing ${isOverdue(t) ? "border-red-300 bg-red-50" : ""} ${dragId === t.id ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button className="text-sm font-semibold text-gray-800 text-left hover:underline" onClick={() => openEdit(t)}>{t.title}</button>
                      <StatusPill status={t.priority} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                      <span className={isOverdue(t) ? "text-red-600 font-semibold" : ""}>{t.dueDate ? dateFmt(t.dueDate) : "No due date"}</span>
                      <span>{t.assignee?.name || "Unassigned"}</span>
                    </div>
                  </div>
                ))}
                {filtered.filter((t) => t.status === s).length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-6">Drop tasks here</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "calendar" && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <button className="btn-outline btn-sm" onClick={() => shiftMonth(-1)}>← Prev</button>
            <h2 className="font-semibold text-forest-900">{monthLabel}</h2>
            <button className="btn-outline btn-sm" onClick={() => shiftMonth(1)}>Next →</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500 mb-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendar.map((cell, idx) => (
              <div key={idx} className={`min-h-24 rounded-lg border p-1.5 text-xs ${cell ? "bg-white border-gray-200" : "bg-gray-50 border-transparent"}`}>
                {cell && (
                  <>
                    <p className={`font-semibold mb-1 ${cell.key === todayStr() ? "text-forest-700" : "text-gray-500"}`}>{cell.day}</p>
                    <div className="space-y-1">
                      {cell.tasks.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => openEdit(t)}
                          className={`block w-full text-left rounded px-1 py-0.5 truncate ${isOverdue(t) ? "bg-red-100 text-red-700" : t.status === "COMPLETED" ? "bg-forest-100 text-forest-800" : "bg-amber-100 text-amber-800"}`}
                          title={`${t.title} (${t.priority})`}
                        >
                          {t.title}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit task modal */}
      <Modal open={!!taskModal} onClose={() => setTaskModal(null)} title={taskModal?.mode === "add" ? "Add Task" : "Edit Task"} wide>
        {formError && <div className="mb-4"><Alert type="error">{formError}</Alert></div>}
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" required className="sm:col-span-2"><input className="input" required value={form.title} onChange={set("title")} /></Field>
          <Field label="Description" className="sm:col-span-2"><textarea className="input" rows={3} value={form.description} onChange={set("description")} /></Field>
          <Field label="Assignee">
            {users ? (
              <select className="input" value={form.assignedTo} onChange={set("assignedTo")}>
                <option value="">Unassigned</option>
                {users.filter((u) => u.isActive !== false).map((u) => <option key={u.id} value={u.id}>{u.name}{u.title ? ` · ${u.title}` : ""}</option>)}
              </select>
            ) : (
              <input className="input" type="number" min="1" placeholder="User ID" value={form.assignedTo} onChange={set("assignedTo")} />
            )}
          </Field>
          <Field label="Due Date"><input className="input" type="date" value={form.dueDate} onChange={set("dueDate")} /></Field>
          <Field label="Priority">
            <select className="input" value={form.priority} onChange={set("priority")}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
            </select>
          </Field>
          {taskModal?.mode === "edit" && (
            <Field label="Status">
              <select className="input" value={form.status} onChange={set("status")}>
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
              </select>
            </Field>
          )}
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setTaskModal(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : taskModal?.mode === "add" ? "Add Task" : "Save Changes"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
