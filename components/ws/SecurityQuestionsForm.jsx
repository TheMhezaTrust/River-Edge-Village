"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { useFetch } from "@/components/ws/common";
import { Alert, Field } from "@/components/ui";
import { dateTimeFmt } from "@/lib/format";

const EMPTY = { currentPassword: "", question1: "", answer1: "", question2: "", answer2: "" };

// Main Administrator only. Answers are stored as bcrypt hashes and the question
// text is never fetched back, so both questions and both answers must be typed
// again to change them.
export default function SecurityQuestionsForm() {
  const { data: status, loading, reload } = useFetch("/api/auth/security-questions");
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      await api.put("/api/auth/security-questions", form);
      setForm(EMPTY);
      setSuccess(true);
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-5 lg:col-span-2">
      <h3 className="font-semibold text-forest-900">Password Recovery Questions</h3>
      <p className="text-xs text-gray-500 mt-1 mb-4">
        Used only by the <span className="font-medium">Forgot password?</span> flow on the workstation sign-in page:
        you must answer both questions correctly before you can set a new password. Answers are stored encrypted and
        are never displayed again — not even to you — so write them down somewhere safe.
      </p>

      {loading && !status ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : status?.configured ? (
        <p className="mb-4 rounded-lg border border-forest-200 bg-forest-50 px-3 py-2 text-xs text-forest-800">
          Recovery questions were last saved {dateTimeFmt(status.updatedAt)}. Saving again replaces both questions and answers.
        </p>
      ) : (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          No recovery questions are set yet. Until you save two questions, the Forgot password? flow cannot reset this account.
        </p>
      )}

      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}
      {success && <div className="mb-4"><Alert type="success">Recovery questions saved.</Alert></div>}

      <form onSubmit={submit} className="grid gap-4">
        <Field label="Your Current Password" required>
          <input className="input max-w-sm" type="password" required value={form.currentPassword} onChange={set("currentPassword")} autoComplete="current-password" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Question 1" required>
            <input className="input" required minLength={5} maxLength={200} value={form.question1} onChange={set("question1")} placeholder="e.g. What was the name of your first school?" />
          </Field>
          <Field label="Answer 1" required>
            <input className="input" type="password" required minLength={3} maxLength={200} value={form.answer1} onChange={set("answer1")} autoComplete="off" />
          </Field>
          <Field label="Question 2" required>
            <input className="input" required minLength={5} maxLength={200} value={form.question2} onChange={set("question2")} placeholder="e.g. In which town were you born?" />
          </Field>
          <Field label="Answer 2" required>
            <input className="input" type="password" required minLength={3} maxLength={200} value={form.answer2} onChange={set("answer2")} autoComplete="off" />
          </Field>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save Recovery Questions"}</button>
        </div>
      </form>
    </div>
  );
}
