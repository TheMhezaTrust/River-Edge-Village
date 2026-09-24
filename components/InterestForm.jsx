"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { Field, Alert } from "@/components/ui";

export default function InterestForm({ plot, kind = "INTEREST", compact = false }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    idNumber: "",
    message: "",
    ...(kind === "VIEWING" ? { date: "", attendees: "2" } : {}),
    ...(kind === "REGISTER" ? { plotPreference: "" } : {}),
    ...(kind === "CONTACT" ? { subject: "" } : {}),
  });
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      const res = await api.post("/api/public/inquiries", { ...form, kind, plotId: plot?.id ?? null });
      setStatus({ type: "success", message: res.message });
      setForm((f) => ({ ...f, name: "", email: "", phone: "", idNumber: "", message: "", subject: "" }));
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  const titles = {
    INTEREST: plot ? `Express Interest in Plot ${plot.number}` : "Express Interest",
    VIEWING: "Schedule a Site Viewing",
    REGISTER: "Register Your Interest",
    CONTACT: "Send Us a Message",
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-label={titles[kind]}>
      {plot && (
        <div className="rounded-lg bg-forest-50 border border-forest-200 px-4 py-3 text-sm text-forest-800">
          <strong>Plot {plot.number}</strong> · Block {plot.block} · {plot.sizeSqm}m² · R{plot.price.toLocaleString("en-ZA")}{" "}
          <span className="text-forest-600">(promotional price until 30 Nov 2026)</span>
        </div>
      )}
      {status && <Alert type={status.type}>{status.message}</Alert>}
      <div className={`grid gap-4 ${compact ? "" : "sm:grid-cols-2"}`}>
        <Field label="Full Name and Surname" required>
          <input className="input" required value={form.name} onChange={set("name")} autoComplete="name" />
        </Field>
        {!compact && kind === "INTEREST" && (
          <Field label="ID Number or Passport Number">
            <input className="input" value={form.idNumber} onChange={set("idNumber")} />
          </Field>
        )}
        <Field label="Email Address" required={kind !== "VIEWING"}>
          <input className="input" type="email" value={form.email} onChange={set("email")} autoComplete="email" />
        </Field>
        <Field label="Phone Number" required>
          <input className="input" type="tel" required value={form.phone} onChange={set("phone")} autoComplete="tel" />
        </Field>
        {kind === "CONTACT" && (
          <Field label="Subject" required className="sm:col-span-2">
            <input className="input" required value={form.subject} onChange={set("subject")} />
          </Field>
        )}
        {kind === "VIEWING" && (
          <>
            <Field label="Preferred Date">
              <input className="input" type="date" value={form.date} onChange={set("date")} />
            </Field>
            <Field label="Number of Attendees">
              <input className="input" type="number" min="1" max="20" value={form.attendees} onChange={set("attendees")} />
            </Field>
          </>
        )}
        {kind === "REGISTER" && (
          <Field label="Plot Preference" className="sm:col-span-2">
            <select className="input" value={form.plotPreference} onChange={set("plotPreference")}>
              <option value="">No preference</option>
              <option value="Near the dam">Near the dam</option>
              <option value="Near green space">Near green space</option>
              <option value="Corner plot">Corner plot</option>
              <option value="Any available">Any available plot</option>
            </select>
          </Field>
        )}
      </div>
      <Field label={kind === "VIEWING" ? "Notes or questions" : "Message or question (optional)"}>
        <textarea className="input" rows={compact ? 2 : 3} value={form.message} onChange={set("message")} />
      </Field>
      <button type="submit" className="btn-accent w-full" disabled={submitting}>
        {submitting ? "Submitting…" : kind === "VIEWING" ? "Request Viewing" : kind === "REGISTER" ? "Register Interest" : "Submit"}
      </button>
      <p className="text-xs text-gray-500 text-center">
        Your details are sent to the Trust (themhezatrust@gmail.com) and logged for follow-up within 24–48 hours.
      </p>
    </form>
  );
}
