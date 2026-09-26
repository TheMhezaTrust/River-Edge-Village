"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { useFetch, PageHeader, LoadingBlock, ErrorBlock } from "@/components/ws/common";
import { usePermissions, ReadOnlyNote } from "@/components/ws/permissions";
import { Modal, Field, StatusPill, Alert } from "@/components/ui";
import PasswordConfirmModal from "@/components/ws/PasswordConfirmModal";

const STATUSES = ["ACTIVE", "PLANNING", "COMPLETED"];
const EMPTY = {
  name: "", slug: "", status: "PLANNING", location: "", address: "", description: "",
  farmSizeHa: "", plotCount: "", familyCount: "", promoPrice: "", standardPrice: "",
  promoEndsAt: "", thumbnail: "", timeline: "",
};

function toForm(p) {
  return {
    name: p.name || "", slug: p.slug || "", status: p.status || "PLANNING", location: p.location || "",
    address: p.address || "", description: p.description || "", farmSizeHa: p.farmSizeHa ?? "",
    plotCount: p.plotCount ?? "", familyCount: p.familyCount ?? "", promoPrice: p.promoPrice ?? "",
    standardPrice: p.standardPrice ?? "", promoEndsAt: p.promoEndsAt || "", thumbnail: p.thumbnail || "",
    timeline: p.timeline ? JSON.stringify(JSON.parse(p.timeline), null, 2) : "",
  };
}

export default function ProjectsAdminPage() {
  const { can } = usePermissions();
  const canManage = can("projects:manage");
  const { data: projects, loading, error, reload } = useFetch("/api/projects");
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null); // { mode, id }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function openAdd() {
    setForm(EMPTY);
    setFormError(null);
    setAddOpen(true);
  }
  function openEdit(p) {
    try {
      setForm(toForm(p));
    } catch {
      setForm({ ...EMPTY, ...p, timeline: p.timeline || "" });
    }
    setFormError(null);
    setEditTarget(p);
  }

  // Step 1: validate lightly, then ask for the password.
  function requestSave(e) {
    e.preventDefault();
    setFormError(null);
    if (!form.name || !form.location || !form.description) {
      setFormError("Name, location and description are required.");
      return;
    }
    setConfirm({ mode: editTarget ? "edit" : "add", id: editTarget?.id });
  }

  // Step 2: password confirmed -> perform the write with the confirm token.
  async function doSave(confirmToken) {
    setSaving(true);
    setFormError(null);
    try {
      if (confirm?.mode === "edit") {
        await api.put(`/api/projects/${confirm.id}`, { ...form, confirmToken });
      } else {
        await api.post("/api/projects", { ...form, confirmToken });
      }
      setAddOpen(false);
      setEditTarget(null);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
      setConfirm(null);
    }
  }

  function requestDelete(p) {
    setFormError(null);
    setConfirm({ mode: "delete", id: p.id, name: p.name });
  }
  async function doDelete(confirmToken) {
    setSaving(true);
    try {
      await api.del(`/api/projects/${confirm.id}?confirmToken=${encodeURIComponent(confirmToken)}`);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
      setConfirm(null);
    }
  }

  async function onConfirmed(token) {
    if (confirm?.mode === "delete") return doDelete(token);
    return doSave(token);
  }

  if (loading && !projects) return <LoadingBlock label="Loading projects…" />;
  if (error) return <ErrorBlock message={error} />;

  const formModal = (
    <Modal open={addOpen || !!editTarget} onClose={() => { setAddOpen(false); setEditTarget(null); }} title={editTarget ? `Edit Project · ${editTarget.name}` : "Add New Project"} wide>
      {formError && <div className="mb-4"><Alert type="error">{formError}</Alert></div>}
      <form onSubmit={requestSave} className="grid gap-4 sm:grid-cols-2">
        <Field label="Project Name" required className="sm:col-span-2"><input className="input" required value={form.name} onChange={set("name")} /></Field>
        <Field label="URL Slug" className="sm:col-span-2">
          <input className="input" value={form.slug} onChange={set("slug")} placeholder={editTarget ? form.slug : "auto-generated from name"} />
          <p className="mt-1 text-xs text-gray-500">Leave blank on create to auto-generate. Changing the slug of a live project changes its public URL.</p>
        </Field>
        <Field label="Status" required>
          <select className="input" required value={form.status} onChange={set("status")}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Location" required><input className="input" required value={form.location} onChange={set("location")} /></Field>
        <Field label="Address" className="sm:col-span-2"><input className="input" value={form.address} onChange={set("address")} /></Field>
        <Field label="Description" required className="sm:col-span-2"><textarea className="input min-h-[100px]" required value={form.description} onChange={set("description")} /></Field>
        <Field label="Farm Size (ha)"><input className="input" type="number" step="0.01" min="0" value={form.farmSizeHa} onChange={set("farmSizeHa")} /></Field>
        <Field label="Plot Count"><input className="input" type="number" min="0" value={form.plotCount} onChange={set("plotCount")} /></Field>
        <Field label="Family Count"><input className="input" type="number" min="0" value={form.familyCount} onChange={set("familyCount")} /></Field>
        <Field label="Promotional Price (R)"><input className="input" type="number" min="0" value={form.promoPrice} onChange={set("promoPrice")} /></Field>
        <Field label="Standard Price (R)"><input className="input" type="number" min="0" value={form.standardPrice} onChange={set("standardPrice")} /></Field>
        <Field label="Promo Ends (display text)"><input className="input" value={form.promoEndsAt} onChange={set("promoEndsAt")} placeholder="e.g. 30 November 2026" /></Field>
        <Field label="Thumbnail URL" className="sm:col-span-2"><input className="input" value={form.thumbnail} onChange={set("thumbnail")} placeholder="/images/hero.png" /></Field>
        <Field label="Timeline (JSON array — advanced)" className="sm:col-span-2">
          <textarea className="input font-mono text-xs min-h-[120px]" value={form.timeline} onChange={set("timeline")} placeholder='[{"label":"Rezoning","status":"IN_PROGRESS","description":"...","date":"2026"}]' />
        </Field>
        <div className="sm:col-span-2 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => { setAddOpen(false); setEditTarget(null); }}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : editTarget ? "Save Changes" : "Create Project"}</button>
        </div>
      </form>
    </Modal>
  );

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle={`${projects.length} project(s) · create and edit public project pages`}
        actions={canManage ? <button className="btn-primary btn-sm" onClick={openAdd}>+ Add Project</button> : undefined}
      />

      {!canManage && <div className="mb-4"><ReadOnlyNote label="projects" /></div>}
      {formError && !addOpen && !editTarget && <div className="mb-4"><Alert type="error">{formError}</Alert></div>}

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr><th>Name</th><th>Slug</th><th>Status</th><th>Location</th><th>Plots</th><th>Price</th><th></th></tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td className="font-semibold text-forest-700">{p.name}</td>
                <td className="font-mono text-xs text-gray-500">{p.slug}</td>
                <td><StatusPill status={p.status} /></td>
                <td className="text-xs text-gray-600">{p.location}</td>
                <td className="text-xs">{p._count?.plots ?? 0}{p.plotCount ? ` / ${p.plotCount}` : ""}</td>
                <td className="text-xs whitespace-nowrap">{p.promoPrice ? `R${p.promoPrice.toLocaleString()}` : "-"}</td>
                <td className="whitespace-nowrap">
                  <Link href={`/projects/${p.slug}`} className="btn-ghost btn-sm" target="_blank">View</Link>
                  {canManage && (
                    <>
                      <button className="btn-ghost btn-sm" onClick={() => openEdit(p)}>Edit</button>
                      <button className="btn-ghost btn-sm text-red-600" onClick={() => requestDelete(p)}>Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {projects.length === 0 && <tr><td colSpan={7} className="text-center text-gray-500 py-10">No projects yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {formModal}

      <PasswordConfirmModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirmed={onConfirmed}
        title={confirm?.mode === "delete" ? "Confirm project deletion" : confirm?.mode === "edit" ? "Confirm project update" : "Confirm new project"}
        description={
          confirm?.mode === "delete"
            ? `Deleting "${confirm?.name}" is permanent and cannot be undone. Re-enter your password to continue.`
            : "Projects appear on the public website. Re-enter your password to confirm this change."
        }
      />
    </div>
  );
}
