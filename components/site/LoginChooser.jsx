"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { Alert, Field } from "@/components/ui";
import { TRUST } from "@/lib/contact";

const TABS = [
  ["member", "Member", "Your plot, payments and documents"],
  ["staff", "Administrator / Staff", "Enterprise Workstation"],
];

export default function LoginChooser({ initialTab = "member" }) {
  const router = useRouter();
  const [tab, setTab] = useState(initialTab === "staff" ? "staff" : "member");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const isStaff = tab === "staff";

  function switchTab(next) {
    setTab(next);
    setError(null);
    setPassword("");
  }

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isStaff) {
        await api.post("/api/auth/login", { email, password });
        router.push("/workstation");
      } else {
        await api.post("/api/portal/login", { email, password });
        router.push("/portal/dashboard");
      }
      router.refresh();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="card p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-forest-900">Sign In</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">Choose how you are signing in.</p>

      <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1.5 mb-6" role="tablist" aria-label="Sign in as">
        {TABS.map(([value, label, sub]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => switchTab(value)}
            className={`rounded-lg px-3 py-2.5 text-left transition-colors cursor-pointer ${
              tab === value ? "bg-white shadow-sm text-forest-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className="block text-sm font-semibold">{label}</span>
            <span className="block text-xs mt-0.5 opacity-75">{sub}</span>
          </button>
        ))}
      </div>

      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label={isStaff ? "Work Email" : "Email Address"} required>
          <input
            className="input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </Field>
        <Field label="Password" required>
          <input
            className="input"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </Field>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Signing in…" : isStaff ? "Sign In to Workstation" : "Sign In to Member Portal"}
        </button>
      </form>

      {isStaff ? (
        <div className="mt-6 rounded-lg bg-earth-50 border border-earth-200 p-3 text-xs text-gray-600">
          <strong>Staff accounts</strong> are issued by the administrator. Every account can view all modules; changes are limited to your role —
          <span className="font-medium"> Administrator</span> (full access),
          <span className="font-medium"> Finance &amp; Member Records</span> (finances and customer information) or
          <span className="font-medium"> Plot Administrator</span> (erf sizes, availability and layout). All activity is logged.
          Contact the administrator if you need access or a password reset.
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <p className="text-center text-sm text-gray-600">
            Member accounts are created by the Trust office. Call {TRUST.primaryPhone} or email{" "}
            <a href={`mailto:${TRUST.email}`} className="text-forest-700 font-semibold hover:underline">{TRUST.email}</a> to be set up.
          </p>
          <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800">
            Your payment details, balance and documents are only visible after you sign in — never to the public and never to another member.
            Forgot your password? Resets are handled by the Trust office for security: call {TRUST.primaryPhone} or email{" "}
            <a href={`mailto:${TRUST.email}`} className="underline font-semibold">{TRUST.email}</a>.
          </div>
        </div>
      )}
    </div>
  );
}
