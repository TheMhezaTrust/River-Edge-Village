"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { useFetch, PageHeader, LoadingBlock, ErrorBlock, ConfirmButton } from "@/components/ws/common";
import { ReadOnlyNote } from "@/components/ws/permissions";
import { Modal, Field, StatusPill, Alert } from "@/components/ui";
import { dateTimeFmt } from "@/lib/format";
import { ROLES, ROLE_PERMISSIONS, ASSIGNABLE_ROLES, SUPER_ADMIN, can } from "@/lib/roles";
import SecurityQuestionsForm from "@/components/ws/SecurityQuestionsForm";

const TABS = ["users", "roles", "profile", "audit"];
const EMPTY_USER = { name: "", email: "", role: "PLOTS", title: "", phone: "", password: "" };
const EMPTY_EDIT = { name: "", role: "", title: "", phone: "", isActive: true, password: "" };

export default function SettingsPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading settings…" />}>
      <SettingsInner />
    </Suspense>
  );
}

function SettingsInner() {
  const searchParams = useSearchParams();
  const initialTab = TABS.includes(searchParams.get("tab")) ? searchParams.get("tab") : "users";
  const [tab, setTab] = useState(initialTab);
  const { data: me, loading: meLoading } = useFetch("/api/auth/me");

  const canManageUsers = can(me, "users:manage");
  const canViewAudit = can(me, "audit:view");

  return (
    <div>
      <PageHeader title="Settings" subtitle="Users, roles, profile and audit trail" />

      <div className="flex flex-wrap gap-2 mb-4 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${tab === t ? "border-forest-600 text-forest-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {meLoading && !me ? (
        <LoadingBlock label="Loading session…" />
      ) : tab === "users" ? (
        <UsersTab canManage={canManageUsers} />
      ) : tab === "roles" ? (
        <RolesTab />
      ) : tab === "profile" ? (
        <ProfileTab me={me} />
      ) : canViewAudit ? (
        <AuditTab />
      ) : (
        <Alert type="error">You do not have permission to view the audit trail (requires audit:view).</Alert>
      )}
    </div>
  );
}

function UsersTab({ canManage }) {
  const { data: users, loading, error, reload } = useFetch("/api/admin/users");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_USER);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setEdit = (k) => (e) => setEditForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  function openEdit(u) {
    setEditForm({ name: u.name || "", role: u.role || "", title: u.title || "", phone: u.phone || "", isActive: u.isActive !== false, password: "" });
    setFormError(null);
    setEditUser(u);
  }

  async function submitAdd(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.post("/api/admin/users", form);
      setAddOpen(false);
      setForm(EMPTY_USER);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const body = { name: editForm.name, role: editForm.role, title: editForm.title || null, phone: editForm.phone || null, isActive: editForm.isActive };
      if (editForm.password) body.password = editForm.password;
      await api.put(`/api/admin/users/${editUser.id}`, body);
      setEditUser(null);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading && !users) return <LoadingBlock label="Loading users…" />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <div>
      <div className="flex justify-between items-center gap-3 mb-3">
        {canManage ? <span /> : <ReadOnlyNote label="the staff directory" />}
        {canManage && <button className="btn-primary btn-sm" onClick={() => { setForm(EMPTY_USER); setFormError(null); setAddOpen(true); }}>+ Add User</button>}
      </div>
      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Title</th><th>Status</th><th>Last Login</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-semibold text-forest-700">{u.name}</td>
                <td className="text-xs">{u.email}</td>
                <td className="text-xs">{ROLES[u.role] || u.role}</td>
                <td className="text-xs text-gray-600">{u.title || "-"}</td>
                <td>{u.isActive ? <StatusPill status="ACTIVE" /> : <span className="pill pill-rejected">Inactive</span>}</td>
                <td className="text-xs whitespace-nowrap">{u.lastLoginAt ? dateTimeFmt(u.lastLoginAt) : "Never"}</td>
                <td className="whitespace-nowrap">
                  {canManage ? (
                    <>
                      <button className="btn-ghost btn-sm" onClick={() => openEdit(u)}>Edit</button>
                      <ConfirmButton
                        label="Deactivate"
                        className="btn-ghost btn-sm text-red-600"
                        confirmText={`Deactivate ${u.name}? They will no longer be able to sign in.`}
                        onConfirm={async () => { await api.del(`/api/admin/users/${u.id}`); reload(); }}
                      />
                    </>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={7} className="text-center text-gray-500 py-10">No users found.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Add user modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add User">
        {formError && <div className="mb-4"><Alert type="error">{formError}</Alert></div>}
        <form onSubmit={submitAdd} className="grid gap-4">
          <Field label="Full Name" required><input className="input" required value={form.name} onChange={set("name")} /></Field>
          <Field label="Email" required><input className="input" type="email" required value={form.email} onChange={set("email")} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Role" required>
              <select className="input" required value={form.role} onChange={set("role")}>
                {Object.entries(ASSIGNABLE_ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Job Title"><input className="input" value={form.title} onChange={set("title")} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone"><input className="input" value={form.phone} onChange={set("phone")} /></Field>
            <Field label="Password (min 8 chars)" required><input className="input" type="password" required minLength={8} value={form.password} onChange={set("password")} /></Field>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setAddOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Add User"}</button>
          </div>
        </form>
      </Modal>

      {/* Edit user modal */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title={`Edit User · ${editUser?.name || ""}`}>
        {formError && <div className="mb-4"><Alert type="error">{formError}</Alert></div>}
        <form onSubmit={submitEdit} className="grid gap-4">
          <Field label="Full Name" required><input className="input" required value={editForm.name} onChange={setEdit("name")} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Role" required>
              <select className="input" required value={editForm.role} onChange={setEdit("role")}>
                {Object.entries(ASSIGNABLE_ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Job Title"><input className="input" value={editForm.title} onChange={setEdit("title")} /></Field>
          </div>
          <Field label="Phone"><input className="input" value={editForm.phone} onChange={setEdit("phone")} /></Field>
          <Field label="Reset Password (leave blank to keep)">
            <input className="input" type="password" minLength={8} value={editForm.password} onChange={setEdit("password")} placeholder="New password (min 8 chars)" />
          </Field>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={editForm.isActive} onChange={setEdit("isActive")} /> Account is active
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setEditUser(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save Changes"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function RolesTab() {
  return (
    <div className="card overflow-x-auto">
      <table className="table-base">
        <thead>
          <tr><th>Role</th><th>Permissions</th></tr>
        </thead>
        <tbody>
          {Object.entries(ROLE_PERMISSIONS).filter(([role]) => role !== SUPER_ADMIN).map(([role, perms]) => (
            <tr key={role}>
              <td className="font-semibold text-forest-700 whitespace-nowrap align-top">{ROLES[role] || role}</td>
              <td>
                <div className="flex flex-wrap gap-1">
                  {perms.map((p) => <span key={p} className="rounded bg-gray-100 border border-gray-200 px-1.5 py-0.5 text-[10px] font-mono text-gray-600">{p}</span>)}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProfileTab({ me }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (form.newPassword !== form.confirm) {
      setError("New passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/auth/change-password", { currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!me) return <ErrorBlock message="Could not load your profile." />;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card p-5">
        <h3 className="font-semibold text-forest-900 mb-3">My Profile</h3>
        <dl className="text-sm space-y-2">
          <div className="flex gap-2"><dt className="font-semibold text-gray-600 w-28">Name</dt><dd>{me.name}</dd></div>
          <div className="flex gap-2"><dt className="font-semibold text-gray-600 w-28">Email</dt><dd>{me.email}</dd></div>
          <div className="flex gap-2"><dt className="font-semibold text-gray-600 w-28">Role</dt><dd>{me.roleLabel || ROLES[me.role] || me.role}</dd></div>
          <div className="flex gap-2"><dt className="font-semibold text-gray-600 w-28">Title</dt><dd>{me.title || "-"}</dd></div>
          <div className="flex gap-2"><dt className="font-semibold text-gray-600 w-28">Phone</dt><dd>{me.phone || "-"}</dd></div>
          <div className="flex gap-2"><dt className="font-semibold text-gray-600 w-28">Last Login</dt><dd>{me.lastLoginAt ? dateTimeFmt(me.lastLoginAt) : "-"}</dd></div>
        </dl>
        <div className="mt-4">
          <p className="label">Permissions</p>
          <div className="flex flex-wrap gap-1">
            {(me.permissions || []).map((p) => <span key={p} className="rounded bg-gray-100 border border-gray-200 px-1.5 py-0.5 text-[10px] font-mono text-gray-600">{p}</span>)}
          </div>
        </div>
      </div>
      <div className="card p-5">
        <h3 className="font-semibold text-forest-900 mb-3">Change Password</h3>
        {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}
        {success && <div className="mb-4"><Alert type="success">Password changed successfully.</Alert></div>}
        <form onSubmit={submit} className="grid gap-4">
          <Field label="Current Password" required><input className="input" type="password" required value={form.currentPassword} onChange={set("currentPassword")} /></Field>
          <Field label="New Password (min 8 chars)" required><input className="input" type="password" required minLength={8} value={form.newPassword} onChange={set("newPassword")} /></Field>
          <Field label="Confirm New Password" required><input className="input" type="password" required minLength={8} value={form.confirm} onChange={set("confirm")} /></Field>
          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Change Password"}</button>
          </div>
        </form>
      </div>
      {me.role === SUPER_ADMIN && <SecurityQuestionsForm />}
    </div>
  );
}

function AuditTab() {
  const [userId, setUserId] = useState("");
  const [actionInput, setActionInput] = useState("");
  const [applied, setApplied] = useState({ userId: "", action: "" });
  const params = new URLSearchParams();
  if (applied.userId) params.set("userId", applied.userId);
  if (applied.action) params.set("action", applied.action);
  const qs = params.toString();
  const { data: logs, loading, error } = useFetch(`/api/admin/audit${qs ? `?${qs}` : ""}`);
  const { data: users } = useFetch("/api/admin/users");

  return (
    <div>
      <div className="card p-4 mb-4 flex flex-wrap gap-3 items-center">
        {users ? (
          <select
            className="input max-w-56"
            value={userId}
            onChange={(e) => { setUserId(e.target.value); setApplied((a) => ({ ...a, userId: e.target.value })); }}
            aria-label="Filter by user"
          >
            <option value="">All users</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        ) : (
          <input
            className="input max-w-40"
            type="number"
            min="1"
            placeholder="User ID"
            value={userId}
            onChange={(e) => { setUserId(e.target.value); setApplied((a) => ({ ...a, userId: e.target.value })); }}
            aria-label="Filter by user ID"
          />
        )}
        <input
          className="input max-w-64"
          placeholder="Filter by action (e.g. TASK_CREATED)…"
          value={actionInput}
          onChange={(e) => setActionInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setApplied((a) => ({ ...a, action: actionInput.trim() })); } }}
          aria-label="Filter by action"
        />
        <button className="btn-outline btn-sm" onClick={() => setApplied((a) => ({ ...a, action: actionInput.trim() }))}>Apply</button>
        <span className="text-sm text-gray-500 ml-auto">{logs?.length ?? 0} entries (latest 200)</span>
      </div>

      {loading && !logs ? (
        <LoadingBlock label="Loading audit trail…" />
      ) : error ? (
        <ErrorBlock message={error} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr><th>When</th><th>Who</th><th>Action</th><th>Entity</th><th>Details</th></tr>
            </thead>
            <tbody>
              {(logs || []).map((l) => (
                <tr key={l.id}>
                  <td className="text-xs whitespace-nowrap">{dateTimeFmt(l.createdAt)}</td>
                  <td className="text-xs">{l.user?.name || "System"}</td>
                  <td><span className="rounded bg-gray-100 border border-gray-200 px-1.5 py-0.5 text-[10px] font-mono text-gray-700">{l.action}</span></td>
                  <td className="text-xs">{l.entity ? `${l.entity}#${l.entityId ?? "-"}` : "-"}</td>
                  <td className="text-xs text-gray-500 max-w-md truncate" title={l.details || ""}>{l.details || "-"}</td>
                </tr>
              ))}
              {(!logs || logs.length === 0) && <tr><td colSpan={5} className="text-center text-gray-500 py-10">No audit entries match your filters.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
