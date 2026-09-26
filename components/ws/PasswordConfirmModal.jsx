"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Modal, Field, Alert } from "@/components/ui";

// Re-enter-password gate for sensitive actions. On success it hands the caller a
// short-lived confirm token to send with the real request; the API re-checks it.
export default function PasswordConfirmModal({ open, onClose, onConfirmed, title = "Confirm your password", description }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setPassword("");
      setError(null);
      setBusy(false);
    }
  }, [open]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.post("/api/auth/verify-password", { password });
      await onConfirmed(res.confirmToken);
      setPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title={title}>
      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}
      <p className="text-sm text-gray-600 mb-4">
        {description || "For your security, re-enter your password to confirm this action."}
      </p>
      <form onSubmit={submit} className="grid gap-4">
        <Field label="Password" required>
          <input
            className="input"
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Verifying…" : "Confirm"}</button>
        </div>
      </form>
    </Modal>
  );
}
