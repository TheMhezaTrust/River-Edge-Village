"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { Alert, Field } from "@/components/ui";

// One form, two entry points: an emailed invitation or reset link (token), and a
// forced change after the office issued a temporary password (no token — the
// member is already signed in and proves they hold the current password).
export default function SetPortalPassword({ token, forced = false }) {
  const router = useRouter();
  const [form, setForm] = useState({ currentPassword: "", password: "", confirm: "" });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (form.password.length < 8) return setError("Choose a password of at least 8 characters");
    if (form.password !== form.confirm) return setError("The two passwords do not match");
    setBusy(true);
    try {
      if (token) {
        await api.post("/api/portal/access", { token, password: form.password });
      } else {
        await api.post("/api/portal/change-password", {
          currentPassword: form.currentPassword,
          newPassword: form.password,
        });
      }
      router.replace("/portal/dashboard");
      router.refresh();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <Alert type="error">{error}</Alert>}

      {forced && (
        <Field label="Temporary password" required>
          <input
            className="input"
            type="password"
            required
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={set("currentPassword")}
          />
        </Field>
      )}

      <Field label="New password (min 8 characters)" required>
        <input
          className="input"
          type="password"
          required
          minLength={8}
          maxLength={200}
          autoComplete="new-password"
          value={form.password}
          onChange={set("password")}
        />
      </Field>
      <Field label="Confirm new password" required>
        <input
          className="input"
          type="password"
          required
          minLength={8}
          maxLength={200}
          autoComplete="new-password"
          value={form.confirm}
          onChange={set("confirm")}
        />
      </Field>

      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? "Saving…" : forced ? "Set my new password" : "Set password and sign in"}
      </button>

      <p className="text-xs text-gray-500">
        Use a password you do not use anywhere else. For your security the portal signs you out after
        15 minutes of inactivity.
      </p>
    </form>
  );
}
