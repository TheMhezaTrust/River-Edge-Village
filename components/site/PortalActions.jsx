"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { Alert, Field, Modal } from "@/components/ui";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="btn-outline btn-sm"
      onClick={async () => {
        await api.post("/api/portal/logout");
        router.push("/portal");
        router.refresh();
      }}
    >
      Sign Out
    </button>
  );
}

export function UploadDocument({ categories }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0]?.[0] || "ID_COPY");
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e) {
    e.preventDefault();
    if (!file) return setStatus({ type: "error", message: "Choose a file to upload" });
    setBusy(true);
    setStatus(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", title || file.name);
      fd.append("category", category);
      await api.post("/api/portal/documents", fd);
      setStatus({ type: "success", message: "Document uploaded successfully" });
      setOpen(false);
      setFile(null);
      setTitle("");
      router.refresh();
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="btn-primary btn-sm" onClick={() => setOpen(true)}>Upload Document</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Upload Document">
        {status && <div className="mb-3"><Alert type={status.type}>{status.message}</Alert></div>}
        <form onSubmit={submit} className="space-y-4">
          <Field label="Document Type" required>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Title">
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={file?.name || "e.g. Certified ID copy"} />
          </Field>
          <Field label="File" required>
            <input className="input" type="file" required onChange={(e) => setFile(e.target.files[0])} />
          </Field>
          <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? "Uploading…" : "Upload"}</button>
        </form>
      </Modal>
    </>
  );
}

export function EditContact({ member }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ phone: member.phone || "", physicalAddress: member.physicalAddress || "", postalAddress: member.postalAddress || "" });
  const [status, setStatus] = useState(null);
  const router = useRouter();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    try {
      await api.put("/api/portal/me", form);
      setStatus({ type: "success", message: "Contact details updated" });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    }
  }

  return (
    <>
      <button className="btn-outline btn-sm" onClick={() => setOpen(true)}>Edit Contact Details</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Update Contact Information">
        {status && <div className="mb-3"><Alert type={status.type}>{status.message}</Alert></div>}
        <form onSubmit={submit} className="space-y-4">
          <Field label="Phone Number" required><input className="input" required value={form.phone} onChange={set("phone")} /></Field>
          <Field label="Physical Address"><input className="input" value={form.physicalAddress} onChange={set("physicalAddress")} /></Field>
          <Field label="Postal Address"><input className="input" value={form.postalAddress} onChange={set("postalAddress")} /></Field>
          <button type="submit" className="btn-primary w-full">Save Changes</button>
        </form>
      </Modal>
    </>
  );
}

export function ChangePassword() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ currentPassword: "", newPassword: "" });
  const [status, setStatus] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setStatus(null);
    try {
      await api.post("/api/portal/change-password", form);
      setStatus({ type: "success", message: "Password changed successfully" });
      setForm({ currentPassword: "", newPassword: "" });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    }
  }

  return (
    <>
      <button className="btn-ghost btn-sm" onClick={() => setOpen(true)}>Change Password</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Change Password">
        {status && <div className="mb-3"><Alert type={status.type}>{status.message}</Alert></div>}
        <form onSubmit={submit} className="space-y-4">
          <Field label="Current Password"><input className="input" type="password" value={form.currentPassword} onChange={set("currentPassword")} /></Field>
          <Field label="New Password (min 8 characters)" required><input className="input" type="password" required minLength={8} value={form.newPassword} onChange={set("newPassword")} /></Field>
          <button type="submit" className="btn-primary w-full">Update Password</button>
        </form>
      </Modal>
    </>
  );
}
