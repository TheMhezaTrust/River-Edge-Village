"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { Alert } from "@/components/ui";

const ANON_KEY = "mheza_anon_id";

// A stable per-browser id so an anonymous visitor's acceptance can be attributed
// without accounts. Generated once and persisted in localStorage.
function getAnonymousId() {
  if (typeof window === "undefined") return null;
  try {
    let id = window.localStorage.getItem(ANON_KEY);
    if (!id) {
      id =
        window.crypto?.randomUUID?.() ||
        `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export default function TermsAcceptance() {
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState(null);

  async function onAccept() {
    if (!checked || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/api/terms-acceptance", { anonymousId: getAnonymousId() });
      setAccepted(true);
    } catch (err) {
      setError(err?.message || "Sorry, we could not record your acceptance. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (accepted) {
    return (
      <div className="rounded-xl border border-forest-200 bg-forest-50 p-6">
        <Alert type="success">Thank you. Your acceptance has been recorded.</Alert>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-bold text-forest-900 mb-4">Acceptance</h2>
      {error && (
        <div className="mb-4">
          <Alert type="error">{error}</Alert>
        </div>
      )}
      <label className="flex items-start gap-3 text-sm text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 text-forest-700 focus:ring-forest-500"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
        <span>By clicking Accept you agree to all the Terms and Conditions of the River Edge project.</span>
      </label>
      <button
        type="button"
        onClick={onAccept}
        disabled={!checked || submitting}
        className="btn-accent mt-5 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Recording…" : "Accept"}
      </button>
    </div>
  );
}
