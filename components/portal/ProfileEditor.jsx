"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { Alert, Field } from "@/components/ui";

const ROWS = [
  ["Full name", "fullName"],
  ["ID number", "idNumber"],
  ["Date of birth", "dateOfBirth"],
  ["Gender", "gender"],
  ["Marital status", "maritalStatus"],
  ["Physical address", "physicalAddress"],
  ["Postal address", "postalAddress"],
  ["Contact number", "phone"],
  ["Email address", "email"],
];

// Everything the Trust holds about the member. Only the contact fields are
// editable here; name and ID number are a separate approval request because they
// identify the plot holder on the Trust's records.
export default function ProfileEditor({ member }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const emailChanged = form ? form.email.trim().toLowerCase() !== (member.email || "").toLowerCase() : false;

  function open() {
    setForm({
      phone: member.phone || "",
      physicalAddress: member.physicalAddress || "",
      postalAddress: member.postalAddress || "",
      email: member.email || "",
      currentPassword: "",
    });
    setError(null);
    setSaved(null);
    setEditing(true);
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = {
        phone: form.phone,
        physicalAddress: form.physicalAddress,
        postalAddress: form.postalAddress,
      };
      // The email address is also the login, so it is only sent when it actually
      // changed and it is proved with the current password.
      if (emailChanged) {
        body.email = form.email;
        body.currentPassword = form.currentPassword;
      }
      await api.put("/api/portal/me", body);
      setEditing(false);
      setSaved("Your contact details have been updated.");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-lg font-bold text-forest-900">Personal details</h2>
        {!editing && (
          <button className="btn-outline btn-sm" onClick={open}>Edit contact details</button>
        )}
      </div>

      {saved && <div className="mt-4"><Alert type="success" onClose={() => setSaved(null)}>{saved}</Alert></div>}

      <dl className="mt-4 divide-y divide-gray-100 text-sm">
        {ROWS.map(([label, key]) => (
          <div key={key} className="flex flex-wrap justify-between gap-2 py-2.5">
            <dt className="text-gray-500">{label}</dt>
            <dd className="font-medium text-gray-900 text-right break-words">{member[key] || "—"}</dd>
          </div>
        ))}
      </dl>

      {editing && (
        <form onSubmit={submit} className="mt-5 space-y-4 rounded-lg border border-gray-200 bg-earth-50/50 p-4">
          <h3 className="text-sm font-semibold text-forest-900">Update your contact details</h3>
          {error && <Alert type="error">{error}</Alert>}

          <Field label="Contact number" required>
            <input className="input" required value={form.phone} onChange={set("phone")} autoComplete="tel" />
          </Field>
          <Field label="Physical address">
            <input className="input" value={form.physicalAddress} onChange={set("physicalAddress")} autoComplete="street-address" />
          </Field>
          <Field label="Postal address">
            <input className="input" value={form.postalAddress} onChange={set("postalAddress")} />
          </Field>
          <Field label="Email address" required>
            <input className="input" type="email" required value={form.email} onChange={set("email")} autoComplete="email" />
          </Field>

          {emailChanged && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs text-amber-900 mb-2">
                Your email address is how you sign in. Confirm your current password to change it.
              </p>
              <Field label="Current password" required>
                <input
                  className="input"
                  type="password"
                  required
                  value={form.currentPassword}
                  onChange={set("currentPassword")}
                  autoComplete="current-password"
                />
              </Field>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(false)} disabled={busy}>Cancel</button>
            <button type="submit" className="btn-primary btn-sm" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
          </div>
        </form>
      )}

      <p className="mt-4 text-xs text-gray-500">
        Your name and ID number cannot be edited here — request a correction below and the Trust office will approve it.
      </p>
    </div>
  );
}
