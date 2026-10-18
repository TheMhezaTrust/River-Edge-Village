"use client";

import { useRef, useState } from "react";
import { uploadPresigned } from "@vercel/blob/client";
import { api } from "@/lib/api-client";
import { useFetch, LoadingBlock, ErrorBlock } from "@/components/ws/common";
import { Modal, Field, Alert } from "@/components/ui";
import PasswordConfirmModal from "@/components/ws/PasswordConfirmModal";
import { DOCUMENT_CATEGORIES, dateFmt, fileSizeLabel } from "@/lib/format";
import { MAX_DOCUMENT_BYTES } from "@/lib/member-documents";

const SUGGESTED_TITLE = "Acknowledgement of Payment and Plot Allocation";
const MAX_MB = Math.round(MAX_DOCUMENT_BYTES / (1024 * 1024));

// The member's vault: signed and stamped paperwork the office issues to them. The
// PDF is uploaded straight from the browser to Vercel Blob through a presigned,
// put-scoped token, so large scans never pass through a serverless function; this
// panel then saves the row that makes the file appear in the member's portal.
export default function MemberContracts({ memberId, memberName, canManage }) {
  const { data: documents, loading, error, reload } = useFetch(`/api/members/${memberId}/documents`);
  const fileRef = useRef(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState(SUGGESTED_TITLE);
  const [category, setCategory] = useState("ALLOCATION");
  // A password re-confirmation waiting to run: { title, description, run(token) }.
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [formError, setFormError] = useState(null);
  const [notice, setNotice] = useState(null);

  function resetForm() {
    setFile(null);
    setTitle(SUGGESTED_TITLE);
    setCategory("ALLOCATION");
    setProgress(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function openUpload() {
    resetForm();
    setFormError(null);
    setNotice(null);
    setUploadOpen(true);
  }

  function submitUpload(e) {
    e.preventDefault();
    setFormError(null);
    setNotice(null);
    if (!file) {
      setFormError("Choose the signed PDF to upload.");
      return;
    }
    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
      setFormError("Only PDF files can be added to a member's documents.");
      return;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      setFormError(`That file is over the ${MAX_MB} MB limit. Scan it at a lower resolution, or split it and upload each part.`);
      return;
    }
    if (!title.trim()) {
      setFormError("Give the document a title the member will recognise.");
      return;
    }
    setConfirm({
      title: "Confirm this upload",
      description: `${title.trim()} will be filed under ${memberName} and become visible in their portal immediately. Re-enter your password to continue.`,
      run: upload,
    });
  }

  async function upload(confirmToken) {
    setBusy(true);
    try {
      // The presigned flow signs one exact pathname, so make it unique: a second
      // scan of the same form must not overwrite the first.
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "document.pdf";
      const pathname = `member-documents/${memberId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
      const uploaded = await uploadPresigned(pathname, file, {
        access: "public",
        handleUploadUrl: "/api/member-documents/upload",
        clientPayload: JSON.stringify({ confirmToken, memberId: Number(memberId) }),
        onUploadProgress: (p) => setProgress(p.percentage),
      });
      await api.post(`/api/members/${memberId}/documents`, {
        title: title.trim(),
        category,
        fileName: file.name,
        filePath: uploaded.url,
        sizeKb: Math.round(file.size / 1024),
        confirmToken,
      });
      setConfirm(null);
      setUploadOpen(false);
      resetForm();
      setNotice("Document filed. The member can open and download it in their portal now.");
      reload();
    } catch (err) {
      setConfirm(null);
      setFormError(err.message || "Upload failed. Please try again.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  function askDelete(doc) {
    setFormError(null);
    setNotice(null);
    setConfirm({
      title: "Delete this document?",
      description: `${doc.title} (${doc.fileName}) will be removed from ${memberName}'s records and disappear from their portal immediately. This cannot be undone.`,
      run: async (token) => {
        await api.del(`/api/members/${memberId}/documents/${doc.id}?confirmToken=${encodeURIComponent(token)}`);
        setConfirm(null);
        reload();
      },
    });
  }

  const list = documents || [];

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-6 py-4">
        <div className="min-w-0">
          <h2 className="font-bold text-gray-900">Member Contracts</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Signed and stamped paperwork issued to this member. They can open and download it in their portal.
          </p>
        </div>
        {canManage && (
          <button className="btn-primary btn-sm shrink-0" disabled={busy} onClick={openUpload}>
            📄 Upload PDF
          </button>
        )}
      </div>

      {(notice || formError) && (
        <div className="space-y-3 px-6 pt-4">
          {notice && <Alert type="success" onClose={() => setNotice(null)}>{notice}</Alert>}
          {formError && !uploadOpen && <Alert type="error" onClose={() => setFormError(null)}>{formError}</Alert>}
        </div>
      )}

      {loading && !documents ? (
        <div className="p-6"><LoadingBlock label="Loading documents…" /></div>
      ) : error ? (
        <div className="p-6"><ErrorBlock message={error} /></div>
      ) : list.length === 0 ? (
        <p className="p-6 text-sm text-gray-500">
          Nothing issued yet.
          {canManage
            ? " Upload the signed Acknowledgement of Payment and Plot Allocation so the member has their own copy in the portal."
            : ""}
        </p>
      ) : (
        <table className="table-base">
          <thead>
            <tr>
              <th>Document</th>
              <th>Category</th>
              <th>Added</th>
              <th>Size</th>
              {canManage && <th className="text-right">Manage</th>}
            </tr>
          </thead>
          <tbody>
            {list.map((doc) => (
              <tr key={doc.id}>
                <td>
                  <a
                    href={`/api/member-documents/${doc.id}/file`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-forest-700 hover:underline"
                  >
                    {doc.title}
                  </a>
                  <p className="max-w-[18rem] truncate text-xs text-gray-400">{doc.fileName}</p>
                  {doc.uploadedBy?.name && <p className="text-xs text-gray-400">uploaded by {doc.uploadedBy.name}</p>}
                </td>
                <td className="whitespace-nowrap text-xs text-gray-600">
                  {DOCUMENT_CATEGORIES[doc.category] || doc.category}
                </td>
                <td className="whitespace-nowrap">{dateFmt(doc.createdAt)}</td>
                <td className="whitespace-nowrap text-xs text-gray-500">{fileSizeLabel(doc.sizeKb) || "-"}</td>
                {canManage && (
                  <td className="whitespace-nowrap text-right">
                    <a href={`/api/member-documents/${doc.id}/file?download=1`} className="btn-ghost btn-sm">Download</a>
                    <button className="btn-ghost btn-sm text-red-600" disabled={busy} onClick={() => askDelete(doc)}>
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!canManage && list.length > 0 && (
        <p className="border-t border-gray-100 px-6 py-3 text-xs text-gray-500">
          Read-only view — only staff with document-management rights can add to or remove from a member&apos;s vault.
        </p>
      )}

      {/* Upload a signed PDF into this member's vault */}
      <Modal open={uploadOpen} onClose={() => (busy ? () => {} : setUploadOpen(false))} title={`Upload a document — ${memberName}`}>
        {formError && <div className="mb-3"><Alert type="error">{formError}</Alert></div>}
        <form onSubmit={submitUpload} className="space-y-4">
          <Field label="PDF file" required>
            <input
              ref={fileRef}
              className="input"
              type="file"
              accept="application/pdf,.pdf"
              required
              onChange={(e) => { setFile(e.target.files?.[0] || null); setFormError(null); }}
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Signed and stamped scans, up to {MAX_MB} MB. Uploaded straight from your browser to the Trust&apos;s
              private storage — it is never placed in a public folder.
            </p>
          </Field>

          <Field label="Title" required>
            <input
              className="input"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-gray-500">
              What the member will see in their portal. Add the plot number where it helps, e.g.
              &ldquo;{SUGGESTED_TITLE} — Plot 45&rdquo;.
            </p>
          </Field>

          <Field label="Category" required>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {Object.entries(DOCUMENT_CATEGORIES).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>

          {busy && progress != null && (
            <div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div className="h-full rounded-full bg-forest-600 transition-all" style={{ width: `${Math.round(progress)}%` }} />
              </div>
              <p className="mt-1 text-xs text-gray-500">Uploading… {Math.round(progress)}%</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" disabled={busy} onClick={() => setUploadOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={busy || !file}>
              {busy ? "Uploading…" : "Upload Document…"}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            For your security, you&apos;ll be asked to confirm your password before the file is stored.
          </p>
        </form>
      </Modal>

      <PasswordConfirmModal
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirmed={async (token) => { await confirm.run(token); }}
        title={confirm?.title}
        description={confirm?.description}
      />
    </div>
  );
}
