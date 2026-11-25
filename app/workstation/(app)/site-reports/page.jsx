"use client";

import { useRef, useState } from "react";
import { uploadPresigned } from "@vercel/blob/client";
import { api } from "@/lib/api-client";
import { useFetch, PageHeader, LoadingBlock, ErrorBlock } from "@/components/ws/common";
import { Field, Alert, EmptyState } from "@/components/ui";
import { usePermissions } from "@/components/ws/permissions";
import { seesEveryReport } from "@/lib/site-reports";
import { dateFmt, dateTimeFmt } from "@/lib/format";

// Today in the browser's own calendar, not UTC: an ISO string sliced at midnight
// would offer yesterday's date to anyone logging work in the small hours.
function todayLocal() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export default function SiteReportsPage() {
  const { user, can } = usePermissions();
  const manage = can("sitereports:manage");
  const seesAll = seesEveryReport(user?.role);
  const { data: reports, loading, error, reload } = useFetch("/api/site-reports");

  const fileRef = useRef(null);
  const [workDate, setWorkDate] = useState(todayLocal());
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [msg, setMsg] = useState(null);
  const [formError, setFormError] = useState(null);

  function onPick(e) {
    const f = e.target.files?.[0] || null;
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
    setMsg(null);
    setFormError(null);
  }

  function resetForm() {
    if (preview) URL.revokeObjectURL(preview);
    setWorkDate(todayLocal());
    setTitle("");
    setNotes("");
    setFile(null);
    setPreview(null);
    setProgress(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    setFormError(null);
    if (file && !file.type.startsWith("image/")) {
      setFormError("The selected file is not an image.");
      return;
    }

    setBusy(true);
    try {
      let photoUrl = null;
      if (file) {
        // The presigned flow signs an exact pathname, so build a unique one.
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
        const pathname = `site-reports/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
        const uploaded = await uploadPresigned(pathname, file, {
          access: "public",
          handleUploadUrl: "/api/site-reports/upload",
          onUploadProgress: (p) => setProgress(p.percentage),
        });
        photoUrl = uploaded.url;
      }

      await api.post("/api/site-reports", {
        workDate,
        title,
        notes,
        photoUrl,
        photoName: file ? file.name : null,
      });

      resetForm();
      setMsg("Report logged. It now appears in the feed below.");
      reload();
    } catch (err) {
      setFormError(err.message || "Could not save the report. Please try again.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  if (loading && !reports) return <LoadingBlock label="Loading site reports…" />;
  if (error) return <ErrorBlock message={error} />;

  const list = reports || [];
  const dirty = title || notes || file || workDate !== todayLocal();

  return (
    <div>
      <PageHeader
        title="Site Reports"
        subtitle="Log the work done on the ground at River Edge Rural Village — clearing, fencing, grading, repairs. Reports are read by the Main Administrator and cannot be edited or deleted once logged."
      />

      {msg && <div className="mb-4"><Alert type="success">{msg}</Alert></div>}
      {formError && <div className="mb-4"><Alert type="error">{formError}</Alert></div>}

      {manage && (
        <div className="card p-5 mb-8">
          <h2 className="text-lg font-bold text-forest-900 mb-4">Log work done</h2>
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-[14rem_1fr]">
              <Field label="Date of work" required>
                <input
                  className="input"
                  type="date"
                  value={workDate}
                  max={todayLocal()}
                  required
                  onChange={(e) => setWorkDate(e.target.value)}
                />
              </Field>
              <Field label="Summary of work" required>
                <input
                  className="input"
                  value={title}
                  required
                  maxLength={140}
                  placeholder="e.g. Cleared trees on Road A"
                  onChange={(e) => setTitle(e.target.value)}
                />
              </Field>
            </div>

            <Field label="Description / notes">
              <textarea
                className="input min-h-28"
                value={notes}
                maxLength={4000}
                placeholder="What was done, where on the site, who did it, anything the Administrator should know."
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>

            <Field label="Photo (optional)">
              <input ref={fileRef} className="input" type="file" accept="image/*" onChange={onPick} />
              <p className="mt-1.5 text-xs text-gray-500">
                Uploaded straight from your browser, so a photo taken on site is fine.
              </p>
            </Field>

            {preview && (
              <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Selected preview" className="max-h-64 w-auto object-contain" />
              </div>
            )}

            {busy && progress != null && (
              <div>
                <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                  <div className="h-full bg-forest-600 transition-all" style={{ width: `${Math.round(progress)}%` }} />
                </div>
                <p className="mt-1 text-xs text-gray-500">Uploading photo… {Math.round(progress)}%</p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button type="submit" className="btn-primary" disabled={busy || !title.trim()}>
                {busy ? "Saving…" : "Log Report"}
              </button>
              {dirty && !busy && (
                <button type="button" className="btn-ghost" onClick={resetForm}>Clear</button>
              )}
            </div>
            <p className="text-xs text-gray-500">
              A report is permanent once logged. If something needs correcting, log a follow-up report.
            </p>
          </form>
        </div>
      )}

      <h2 className="text-lg font-bold text-forest-900 mb-3">
        {seesAll ? "All reports" : "Your reports"}{" "}
        <span className="text-sm font-normal text-gray-500">({list.length})</span>
      </h2>

      {list.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No site reports yet"
            message={manage ? "Log the first piece of ground work above." : "Nothing has been logged yet."}
          />
        </div>
      ) : (
        <ul className="grid gap-4">
          {list.map((r) => (
            <li key={r.id} className="card p-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="font-semibold text-gray-900">{r.title}</h3>
                <span className="text-xs font-medium text-forest-700">{dateFmt(r.workDate)}</span>
              </div>
              {r.notes && <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">{r.notes}</p>}
              {r.photoUrl && (
                <a href={r.photoUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block rounded-lg overflow-hidden border border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.photoUrl} alt={r.photoName || r.title} className="max-h-56 w-auto object-contain" loading="lazy" />
                </a>
              )}
              <p className="mt-3 text-xs text-gray-400">
                {r.createdBy ? `${r.createdBy.name} · ` : ""}Logged {dateTimeFmt(r.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
