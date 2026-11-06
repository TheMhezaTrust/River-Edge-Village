"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadPresigned } from "@vercel/blob/client";
import { api } from "@/lib/api-client";
import { Alert } from "@/components/ui";
import { MAX_PHOTO_BYTES, PHOTO_TYPES, photoPathname } from "@/lib/member-photo";

// A member picks a JPG/PNG, it uploads straight to Vercel Blob through a pathname-scoped
// presigned token (so the store's read/write token never reaches the browser), and the
// resulting Blob URL is saved by POST /api/portal/photo — which re-checks that the URL is
// a Blob link inside this member's own folder. The stored URL is never shown; the picture
// is streamed back through /api/portal/photo.
export default function ProfilePhotoUpload({ memberId, hasPhoto }) {
  const router = useRouter();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null);

  function onPick(e) {
    const f = e.target.files?.[0] || null;
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
    setFile(f);
    setError(null);
    setSaved(null);
  }

  function reset() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setProgress(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setSaved(null);
    if (!file) {
      setError("Please choose a photo to upload.");
      return;
    }
    if (!PHOTO_TYPES.includes(file.type)) {
      setError("Only JPG or PNG photos can be uploaded.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError("That photo is larger than 5 MB. Please choose a smaller one.");
      return;
    }

    setBusy(true);
    try {
      const uploaded = await uploadPresigned(photoPathname(memberId, file), file, {
        access: "public",
        handleUploadUrl: "/api/portal/photo/upload",
        clientPayload: JSON.stringify({ memberId }),
        onUploadProgress: (p) => setProgress(p.percentage),
      });
      await api.post("/api/portal/photo", { url: uploaded.url });
      reset();
      setSaved("Your profile photo has been updated.");
      router.refresh();
    } catch (err) {
      setError(err.message || "Upload failed. Please try again.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div className="card p-6">
      <h2 className="text-lg font-bold text-forest-900">Profile photo</h2>
      <p className="mt-1 text-sm text-gray-600">
        Add a photo so the Trust office can recognise you. It appears on your dashboard and on the
        Trust&apos;s view of your profile. JPG or PNG, up to 5 MB.
      </p>

      {saved && <div className="mt-4"><Alert type="success" onClose={() => setSaved(null)}>{saved}</Alert></div>}
      {error && <div className="mt-4"><Alert type="error">{error}</Alert></div>}

      <form onSubmit={submit} className="mt-4 grid gap-4">
        {preview ? (
          <div className="h-32 w-32 rounded-full overflow-hidden border border-gray-200 bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Selected profile photo" className="h-full w-full object-cover" />
          </div>
        ) : hasPhoto ? (
          <div className="h-32 w-32 rounded-full overflow-hidden border border-gray-200 bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/api/portal/photo" alt="Your current profile photo" className="h-full w-full object-cover" />
          </div>
        ) : null}

        <input
          ref={fileRef}
          className="input"
          type="file"
          accept="image/jpeg,image/png"
          onChange={onPick}
        />

        {busy && progress != null && (
          <div>
            <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
              <div className="h-full bg-forest-600 transition-all" style={{ width: `${Math.round(progress)}%` }} />
            </div>
            <p className="mt-1 text-xs text-gray-500">Uploading… {Math.round(progress)}%</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary btn-sm" disabled={busy || !file}>
            {busy ? "Uploading…" : hasPhoto ? "Replace photo" : "Upload photo"}
          </button>
          {file && !busy && (
            <button type="button" className="btn-ghost btn-sm" onClick={reset}>Clear</button>
          )}
        </div>
      </form>
    </div>
  );
}
