"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { api } from "@/lib/api-client";
import { useFetch, PageHeader, LoadingBlock, ErrorBlock } from "@/components/ws/common";
import { Field, Alert } from "@/components/ui";
import PasswordConfirmModal from "@/components/ws/PasswordConfirmModal";

export default function GalleryAdminPage() {
  const { data: images, loading, error, reload } = useFetch("/api/gallery");
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
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
    setFile(null);
    setPreview(null);
    setTitle("");
    setDescription("");
    setProgress(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function submit(e) {
    e.preventDefault();
    setMsg(null);
    setFormError(null);
    if (!file) {
      setFormError("Please choose an image file to upload.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setFormError("The selected file is not an image.");
      return;
    }
    setConfirmOpen(true);
  }

  async function doUpload(confirmToken) {
    setBusy(true);
    setFormError(null);
    try {
      await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/gallery/upload",
        clientPayload: JSON.stringify({ title, description, confirmToken }),
        onUploadProgress: (p) => setProgress(p.percentage),
      });
      setConfirmOpen(false);
      resetForm();
      setMsg("Image uploaded. It may take a few seconds to appear in the gallery and on the public page.");
      reload();
      setTimeout(() => reload(), 1500);
    } catch (err) {
      setConfirmOpen(false);
      setFormError(err.message || "Upload failed. Please try again.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  async function remove(image) {
    if (!window.confirm("Remove this image from the public gallery? This cannot be undone.")) return;
    try {
      await api.del(`/api/gallery/${image.id}`);
      setMsg(null);
      reload();
    } catch (err) {
      setFormError(err.message);
    }
  }

  if (loading && !images) return <LoadingBlock label="Loading gallery…" />;
  if (error) return <ErrorBlock message={error} />;

  const list = images || [];

  return (
    <div>
      <PageHeader
        title="Photo Gallery"
        subtitle="Upload photos to the public “Life at River Edge Village” gallery. Images are stored in Vercel Blob; high-resolution files are supported."
      />

      {msg && <div className="mb-4"><Alert type="success">{msg}</Alert></div>}
      {formError && <div className="mb-4"><Alert type="error">{formError}</Alert></div>}

      <div className="card p-5 mb-8">
        <h2 className="text-lg font-bold text-forest-900 mb-4">Upload an image</h2>
        <form onSubmit={submit} className="grid gap-4">
          <Field label="Image file" required>
            <input
              ref={fileRef}
              className="input"
              type="file"
              accept="image/*"
              required
              onChange={onPick}
            />
            <p className="mt-1.5 text-xs text-gray-500">
              JPEG, PNG, WebP or GIF. Uploaded directly from your browser, so large high-resolution photos are fine.
            </p>
          </Field>

          {preview && (
            <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Selected preview" className="max-h-64 w-auto object-contain" />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title (optional)">
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
            </Field>
            <Field label="Description (optional)">
              <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} />
            </Field>
          </div>

          {busy && progress != null && (
            <div>
              <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                <div className="h-full bg-forest-600 transition-all" style={{ width: `${Math.round(progress)}%` }} />
              </div>
              <p className="mt-1 text-xs text-gray-500">Uploading… {Math.round(progress)}%</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button type="submit" className="btn-primary" disabled={busy || !file}>
              {busy ? "Uploading…" : "Upload Image"}
            </button>
            {(file || title || description) && !busy && (
              <button type="button" className="btn-ghost" onClick={resetForm}>Clear</button>
            )}
          </div>
          <p className="text-xs text-gray-500">
            For your security, you&apos;ll be asked to confirm your password before the upload is published.
          </p>
        </form>
      </div>

      <h2 className="text-lg font-bold text-forest-900 mb-3">
        Uploaded images <span className="text-sm font-normal text-gray-500">({list.length})</span>
      </h2>

      {list.length === 0 ? (
        <div className="card p-8 text-center text-sm text-gray-500">
          No images yet. Upload your first photo above.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((img) => (
            <div key={img.id} className="card overflow-hidden flex flex-col">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.title || "Gallery image"} className="h-44 w-full object-cover" loading="lazy" />
              <div className="p-3 flex-1 flex flex-col">
                {img.title && <p className="font-semibold text-sm text-gray-900">{img.title}</p>}
                {img.description && <p className="mt-0.5 text-xs text-gray-600">{img.description}</p>}
                <div className="mt-auto pt-3 flex justify-end">
                  <button className="btn-danger btn-sm" onClick={() => remove(img)}>Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <PasswordConfirmModal
        open={confirmOpen}
        onClose={() => (busy ? () => {} : setConfirmOpen(false))}
        onConfirmed={doUpload}
        title="Confirm gallery upload"
        description="Publishing an image to the public gallery is a sensitive action. Re-enter your password to continue."
      />
    </div>
  );
}
