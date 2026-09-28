"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Alert, Field } from "@/components/ui";

const TITLES = {
  email: "Reset Your Password",
  q1: "Security Question 1 of 2",
  q2: "Security Question 2 of 2",
  reset: "Choose a New Password",
  done: "Password Updated",
};

export default function PasswordRecovery() {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  function restart() {
    setStep("email");
    setToken("");
    setQuestion("");
    setAnswer("");
    setPassword("");
    setConfirm("");
    setError(null);
    setNotice(null);
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (step === "reset" && password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      if (step === "email") {
        const res = await api.post("/api/auth/recover", { step: "start", email });
        if (!res.available) {
          setNotice(res.message);
          return;
        }
        setQuestion(res.question);
        setToken(res.token);
        setStep("q1");
        return;
      }

      if (step === "q1" || step === "q2") {
        const res = await api.post("/api/auth/recover", {
          step: step === "q1" ? "answer1" : "answer2",
          token,
          answer,
        });
        setToken(res.token);
        setAnswer("");
        if (step === "q1") {
          setQuestion(res.question);
          setStep("q2");
        } else {
          setStep("reset");
        }
        return;
      }

      await api.post("/api/auth/recover", { step: "reset", token, newPassword: password });
      setToken("");
      setPassword("");
      setConfirm("");
      setStep("done");
    } catch (err) {
      setError(err.status === 401 && step !== "reset" ? `${err.message} If your session expired, start again.` : err.message);
    } finally {
      setBusy(false);
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
          <h1 className="text-xl font-bold text-forest-900">{TITLES[step]}</h1>

          {step === "done" ? (
            <>
              <p className="text-sm text-gray-600 mt-2 mb-6">
                Your password has been changed. You can now sign in to the workstation with your new password.
              </p>
              <Link href="/workstation/login" className="btn-primary w-full block text-center">Back to Sign In</Link>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500 mt-1 mb-6">
                {step === "email"
                  ? "Enter the work email address on your staff account."
                  : step === "reset"
                    ? "Both security questions were answered correctly. Choose a new password (minimum 8 characters)."
                    : "Answer both security questions in turn to continue."}
              </p>

              {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}
              {notice && <div className="mb-4"><Alert type="info">{notice}</Alert></div>}

              <form onSubmit={submit} className="space-y-4">
                {step === "email" && (
                  <Field label="Work Email" required>
                    <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" autoFocus />
                  </Field>
                )}

                {(step === "q1" || step === "q2") && (
                  <Field label={question} required>
                    <input className="input" type="password" required value={answer} onChange={(e) => setAnswer(e.target.value)} autoComplete="off" autoFocus />
                    <p className="text-xs text-gray-400 mt-1">Answers are not case-sensitive.</p>
                  </Field>
                )}

                {step === "reset" && (
                  <>
                    <Field label="New Password (min 8 characters)" required>
                      <input className="input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" autoFocus />
                    </Field>
                    <Field label="Confirm New Password" required>
                      <input className="input" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
                    </Field>
                  </>
                )}

                <button type="submit" className="btn-primary w-full" disabled={busy}>
                  {busy ? "Please wait…" : step === "email" ? "Continue" : step === "reset" ? "Set New Password" : "Submit Answer"}
                </button>
              </form>

              <div className="mt-6 flex items-center justify-between text-sm">
                <Link href="/workstation/login" className="text-forest-700 hover:underline">← Back to Sign In</Link>
                {step !== "email" && (
                  <button type="button" onClick={restart} className="text-gray-500 hover:text-gray-700 underline cursor-pointer">
                    Start over
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <p className="text-center mt-6 text-xs text-forest-300">
          Staff accounts without recovery questions must ask the administrator for a password reset.
        </p>
      </div>
    </div>
  );
}
