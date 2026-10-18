"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { Alert, Field } from "@/components/ui";

export default function ChangePortalPassword() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setSaved(null);
    if (form.newPassword.length < 8) return setError("Your new password must be at least 8 characters long.");
    if (form.newPassword !== form.confirm) return setError("The two new passwords do not match.");
    setBusy(true);
    try {
      await api.post("/api/portal/change-password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
      setSaved("Your password has been changed.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6">
      <h2 className="text-lg font-bold text-forest-900">Password</h2>
      <p className="mt-1 text-sm text-gray-600">
        Use at least 8 characters, and do not reuse a password from another site.
      </p>

      {saved && <div className="mt-4"><Alert type="success" onClose={() => setSaved(null)}>{saved}</Alert></div>}
      {error && <div className="mt-4"><Alert type="error">{error}</Alert></div>}

      <form onSubmit={submit} className="mt-4 space-y-4">
        <Field label="Current password" required>
          <input className="input" type="password" required value={form.currentPassword} onChange={set("currentPassword")} autoComplete="current-password" />
        </Field>
        <Field label="New password" required>
          <input className="input" type="password" required minLength={8} value={form.newPassword} onChange={set("newPassword")} autoComplete="new-password" />
        </Field>
        <Field label="Repeat new password" required>
          <input className="input" type="password" required minLength={8} value={form.confirm} onChange={set("confirm")} autoComplete="new-password" />
        </Field>
        <button type="submit" className="btn-primary btn-sm w-full justify-center" disabled={busy}>
          {busy ? "Updating…" : "Change password"}
        </button>
      </form>
    </div>
  );
}
