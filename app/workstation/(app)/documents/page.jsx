"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { useFetch, PageHeader, LoadingBlock, ErrorBlock, ConfirmButton } from "@/components/ws/common";
import { usePermissions, ReadOnlyNote } from "@/components/ws/permissions";
import { Modal, Field, StatusPill, Alert, EmptyState } from "@/components/ui";
import { dateTimeFmt } from "@/lib/format";
import { staffDocumentUrl } from "@/lib/files";

const FOLDERS = ["TRUST", "PROJECT", "LEGAL", "FINANCIAL", "MEMBER", "DEPARTMENT", "MINUTES"];
const ROLE_OPTIONS = ["ADMIN", "FINANCE", "PLOTS"];

export default function DocumentsPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading documents…" />}>
      <DocumentsInner />
    </Suspense>
  );
}

function DocumentsInner() {
  const searchParams = useSearchParams();
  const { can } = usePermissions();
  const canManage = can("documents:manage");

  const [folder, setFolder] = useState("ALL");
  const [q, setQ] = useState("");

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    if (folder !== "ALL") sp.set("folder", folder);
    if (q.trim()) sp.set("q", q.trim());
    const s = sp.toString();
    return `/api/documents${s ? `?${s}` : ""}`;
  }, [folder, q]);

  const { data: docs, loading, error, reload } = useFetch(query);
  const [uploadOpen, setUploadOpen] = useState(canManage && searchParams.get("new") === "1");
  const [form, setForm] = useState({ title: "", folder: "PROJECT", tags: "", description: "", permissions: [] });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("folder", form.folder);
      if (form.tags.trim()) fd.append("tags", form.tags.trim());
      if (form.description.trim()) fd.append("description", form.description.trim());
      if (form.permissions.length) fd.append("permissions", form.permissions.join(","));
      if (file) fd.append("file", file);
      await api.post("/api/documents", fd);
      setUploadOpen(false);
      setForm({ title: "", folder: "PROJECT", tags: "", description: "", permissions: [] });
      setFile(null);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading && !docs) return <LoadingBlock label="Loading documents…" />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <div>
      <PageHeader
        title="Document Management"
        subtitle={`${docs.length} document(s) · trust records, legal files, minutes and member documents`}
        actions={canManage && <button className="btn-primary btn-sm" onClick={() => { setFormError(null); setUploadOpen(true); }}>⬆ Upload Document</button>}
      />

      {!canManage && <div className="mb-4"><ReadOnlyNote label="the document library" /></div>}

      <div className="card p-4 mb-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {["ALL", ...FOLDERS].map((f) => (
            <button
              key={f}
              onClick={() => setFolder(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer border ${
                folder === f ? "bg-forest-700 text-white border-forest-700" : "bg-white text-gray-600 border-gray-300 hover:bg-forest-50"
              }`}
            >
              {f === "ALL" ? "All folders" : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <input className="input max-w-sm" placeholder="Search title, tags or description…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search documents" />
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr><th>Title</th><th>Folder</th><th>Tags</th><th>Uploaded By</th><th>Size</th><th>Version</th><th>Uploaded</th><th></th></tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id}>
                <td>
                  <p className="font-semibold text-gray-900">{d.title}</p>
                  {d.description && <p className="text-xs text-gray-500 mt-0.5">{d.description}</p>}
                </td>
                <td><StatusPill status={d.folder} /></td>
                <td className="text-xs text-gray-600">{d.tags || "-"}</td>
                <td className="text-xs text-gray-600">{d.uploadedBy?.name || "-"}</td>
                <td className="whitespace-nowrap text-xs text-gray-500">{d.sizeKb != null ? `${d.sizeKb} KB` : "-"}</td>
                <td className="text-xs">v{d.version ?? 1}</td>
                <td className="whitespace-nowrap text-xs text-gray-500">{dateTimeFmt(d.createdAt)}</td>
                <td className="whitespace-nowrap">
                  {d.filePath && d.filePath !== "#" ? (
                    <a href={staffDocumentUrl(d.filePath)} target="_blank" rel="noreferrer" className="btn-outline btn-sm">Download</a>
                  ) : (
                    <span className="text-xs text-gray-400">Office file</span>
                  )}
                  {canManage && (
                    <ConfirmButton
                      className="btn-ghost btn-sm text-red-600"
                      confirmText={`Delete document "${d.title}"? This cannot be undone.`}
                      onConfirm={async () => { await api.del(`/api/documents?id=${d.id}`); reload(); }}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {docs.length === 0 && <EmptyState title="No documents found" message="Try a different folder or search term." action={canManage && <button className="btn-primary btn-sm" onClick={() => setUploadOpen(true)}>⬆ Upload the first document</button>} />}
      </div>

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload Document" wide>
        {formError && <div className="mb-4"><Alert type="error">{formError}</Alert></div>}
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" required className="sm:col-span-2"><input className="input" required value={form.title} onChange={set("title")} placeholder="e.g. Trust deed — registered copy" /></Field>
          <Field label="Folder">
            <select className="input" value={form.folder} onChange={set("folder")}>
              {FOLDERS.map((f) => <option key={f} value={f}>{f.charAt(0) + f.slice(1).toLowerCase()}</option>)}
            </select>
          </Field>
          <Field label="Tags (comma separated)"><input className="input" value={form.tags} onChange={set("tags")} placeholder="deed, registry" /></Field>
          <Field label="Description" className="sm:col-span-2">
            <textarea className="input" rows={2} value={form.description} onChange={set("description")} />
          </Field>
          <Field label="File (optional — omit for office/hard-copy files)" className="sm:col-span-2">
            <input className="input" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </Field>
          <div className="sm:col-span-2">
            <p className="label">Restrict to roles (optional — leave empty for all staff)</p>
            <div className="flex flex-wrap gap-2">
              {ROLE_OPTIONS.map((r) => {
                const on = form.permissions.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, permissions: on ? f.permissions.filter((x) => x !== r) : [...f.permissions, r] }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer border ${
                      on ? "bg-forest-700 text-white border-forest-700" : "bg-white text-gray-600 border-gray-300 hover:bg-forest-50"
                    }`}
                  >
                    {r.replaceAll("_", " ")}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setUploadOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Uploading…" : "Upload"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
