"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { Alert, Field } from "@/components/ui";
import { TRUST } from "@/lib/contact";

const PAYMENT_PLANS = [
  ["", "Not sure yet — advise me"],
  ["FULL", "Full payment (promotional price)"],
  ["PLAN_6", "6-month payment plan"],
  ["PLAN_12", "12-month payment plan"],
  ["PLAN_24", "24-month payment plan"],
];

export default function PortalRegister() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", idNumber: "", plotNumber: "", paymentPlan: "", password: "", confirm: "",
  });
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirm) {
      setError("The two passwords do not match");
      return;
    }
    if (!accepted) {
      setError("You must accept the Terms and Conditions of Sale to register");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/portal/register", { ...form, acceptedTerms: accepted });
      router.push("/portal/dashboard");
      router.refresh();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="card p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-forest-900">Create Your Member Account</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">
        Register once, then sign in to see your payment details, outstanding balance and documents, and to upload your
        certified ID copy and beneficiary nomination form.
      </p>

      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Full Name (as per ID)" required>
            <input className="input" required value={form.fullName} onChange={set("fullName")} autoComplete="name" />
          </Field>
          <Field label="South African ID / Passport Number">
            <input className="input" value={form.idNumber} onChange={set("idNumber")} autoComplete="off" />
          </Field>
          <Field label="Email Address" required>
            <input className="input" type="email" required value={form.email} onChange={set("email")} autoComplete="email" />
          </Field>
          <Field label="Cellphone Number" required>
            <input className="input" type="tel" required value={form.phone} onChange={set("phone")} autoComplete="tel" />
          </Field>
          <Field label="Erf / Plot Number of Interest">
            <input className="input" placeholder="e.g. 145A" value={form.plotNumber} onChange={set("plotNumber")} />
          </Field>
          <Field label="Preferred Payment Option">
            <select className="input" value={form.paymentPlan} onChange={set("paymentPlan")}>
              {PAYMENT_PLANS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
          </Field>
          <Field label="Password" required>
            <input className="input" type="password" required minLength={8} value={form.password} onChange={set("password")} autoComplete="new-password" />
          </Field>
          <Field label="Confirm Password" required>
            <input className="input" type="password" required minLength={8} value={form.confirm} onChange={set("confirm")} autoComplete="new-password" />
          </Field>
        </div>

        <label className="flex items-start gap-2.5 text-sm text-gray-700 rounded-lg bg-earth-50 border border-earth-200 p-3">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 rounded border-gray-300" />
          <span>
            I have read and accept the{" "}
            <Link href="/terms" target="_blank" className="text-forest-700 font-semibold underline">Terms and Conditions of Sale</Link>.
            I understand that I acquire a heritable <strong>Right of Use</strong> to a plot, not a title deed or land ownership,
            and that I will be bound by the Community Constitution.
          </span>
        </label>

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Creating your account…" : "Create Account & Sign In"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Already registered?{" "}
        <Link href="/portal" className="text-forest-700 font-semibold hover:underline">Sign in here</Link>
      </p>

      <div className="mt-4 rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800">
        Registering creates your portal account. A consultant confirms your plot allocation and records your payments —
        your balance and documents appear here once that is done. Questions? Call {TRUST.primaryPhone} or email{" "}
        <a href={`mailto:${TRUST.email}`} className="underline font-semibold">{TRUST.email}</a>.
      </div>
    </div>
  );
}
