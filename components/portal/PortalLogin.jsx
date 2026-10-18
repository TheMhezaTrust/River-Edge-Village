"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { Alert, Field } from "@/components/ui";
import { TRUST } from "@/lib/contact";

export default function PortalLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/api/portal/login", { email, password });
      // The office may have issued a temporary password; the member has to replace
      // it before they can see anything.
      router.replace(res.mustChangePassword ? "/portal/password" : "/portal/dashboard");
      router.refresh();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="card p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-forest-900">Member Login</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">Access your plot information, payment history, and documents.</p>

      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email Address" required>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </Field>
        <Field label="Password" required>
          <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </Field>
        <div className="flex justify-end text-sm">
          <button type="button" className="text-forest-700 hover:underline cursor-pointer" onClick={() => setResetOpen((s) => !s)}>
            Forgot password?
          </button>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>

      {resetOpen && <ForgotPassword onClose={() => setResetOpen(false)} defaultEmail={email} />}

      <p className="mt-6 text-center text-xs text-gray-500">
        For your security you are signed out automatically after 15 minutes of inactivity.
      </p>

      <p className="mt-4 text-center text-sm text-gray-600">
        First time here? The Trust office sets up member accounts — call {TRUST.primaryPhone} or email{" "}
        <a href={`mailto:${TRUST.email}`} className="text-forest-700 font-semibold hover:underline">{TRUST.email}</a>.
      </p>

      <div className="mt-4 rounded-lg bg-earth-50 border border-earth-200 p-3 text-xs text-gray-600">
        Your payment details, balance and documents are only visible after you sign in. Read the{" "}
        <Link href="/terms" className="text-forest-700 font-semibold hover:underline">Terms and Conditions of Sale</Link>.
      </div>
    </div>
  );
}

function ForgotPassword({ onClose, defaultEmail }) {
  const [address, setAddress] = useState(defaultEmail || "");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await api.post("/api/portal/forgot-password", { email: address });
      setMessage(res.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 rounded-lg border border-forest-200 bg-forest-50 p-4">
      <h2 className="text-sm font-semibold text-forest-900">Reset your password</h2>
      {message ? (
        <>
          <p className="mt-2 text-xs text-forest-800">{message}</p>
          <button type="button" className="mt-3 text-xs font-semibold text-forest-700 hover:underline cursor-pointer" onClick={onClose}>
            Back to sign in
          </button>
        </>
      ) : (
        <form onSubmit={submit} className="mt-3 space-y-3">
          {error && <Alert type="error">{error}</Alert>}
          <p className="text-xs text-forest-800">
            We will email a link to set a new password. The link works once and expires after 30 minutes.
          </p>
          <Field label="Registered email address" required>
            <input
              className="input"
              type="email"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              autoComplete="email"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost btn-sm" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="submit" className="btn-primary btn-sm" disabled={busy}>{busy ? "Sending…" : "Email me a link"}</button>
          </div>
        </form>
      )}
    </div>
  );
}
