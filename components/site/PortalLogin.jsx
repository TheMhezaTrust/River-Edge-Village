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
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/api/portal/login", { email, password });
      router.push("/portal/dashboard");
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
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-gray-600">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="rounded border-gray-300" />
            Remember me
          </label>
          <button type="button" className="text-forest-700 hover:underline cursor-pointer" onClick={() => setShowReset((s) => !s)}>
            Forgot password?
          </button>
        </div>
        {showReset && (
          <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800">
            For security, portal password resets are handled by the Trust office. Please call {TRUST.primaryPhone} or email{" "}
            <a href={`mailto:${TRUST.email}`} className="underline font-semibold">{TRUST.email}</a> from your registered email address.
          </div>
        )}
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Not registered yet?{" "}
        <Link href="/portal/register" className="text-forest-700 font-semibold hover:underline">Create your member account</Link>
      </p>

      <div className="mt-4 rounded-lg bg-earth-50 border border-earth-200 p-3 text-xs text-gray-600">
        Your payment details, balance and documents are only visible after you sign in. Read the{" "}
        <Link href="/terms" className="text-forest-700 font-semibold hover:underline">Terms and Conditions of Sale</Link>.
      </div>
    </div>
  );
}
