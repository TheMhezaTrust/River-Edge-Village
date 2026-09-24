"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Alert, Field } from "@/components/ui";

export default function WorkstationLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/api/auth/login", { email, password });
      router.push("/workstation");
      router.refresh();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-forest-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <img src="/images/trust-logo.jpg" alt="The Mheza Trust logo" className="h-11 w-11 rounded-lg object-cover" width={44} height={44} />
            <span className="text-left">
              <span className="block font-bold text-white">The Mheza Trust</span>
              <span className="block text-xs text-forest-300 font-medium uppercase tracking-wider">Enterprise Workstation</span>
            </span>
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <h1 className="text-xl font-bold text-forest-900">Staff Sign In</h1>
          <p className="text-sm text-gray-500 mt-1 mb-6">Authorized personnel only. All activity is logged.</p>

          {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Work Email" required>
              <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
            </Field>
            <Field label="Password" required>
              <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </Field>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign In to Workstation"}
            </button>
          </form>

          <div className="mt-6 rounded-lg bg-earth-50 border border-earth-200 p-3 text-xs text-gray-600">
            <strong>Staff accounts</strong> are issued by the administrator. Every account can view all modules; changes are limited to your role —
            <span className="font-medium"> Administrator</span> (full access),
            <span className="font-medium"> Finance &amp; Member Records</span> (finances and customer information) or
            <span className="font-medium"> Plot Administrator</span> (erf sizes, availability and layout).
            Contact the administrator if you need access or a password reset.
          </div>
        </div>

        <p className="text-center mt-6 text-sm text-forest-300">
          <Link href="/" className="hover:text-white underline">← Back to public website</Link>
        </p>
      </div>
    </div>
  );
}
