// Outbound mail goes through Resend's REST API. A plain fetch is used instead of
// the SDK: it is a single endpoint, so there is no dependency to track.
import { TRUST } from "./contact.js";

const RESEND_URL = "https://api.resend.com/emails";

// Deliberately permissive: it only has to reject values that cannot be delivered
// to, not enforce the full RFC.
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EMAIL_FROM =
  process.env.EMAIL_FROM || "The Mheza Trust <inquiries@themhezatrust.co.za>";

// Customers answer staff replies from a mailbox someone actually reads, so the
// sending address is not the address replies land in.
const REPLY_TO = process.env.EMAIL_REPLY_TO || TRUST.email;

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

// Resolves with the Resend message id. Throws with the provider's own message so
// the caller can store it against the failed reply.
export async function sendMail({ to, subject, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Outbound email is not configured (RESEND_API_KEY is missing)");

  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: EMAIL_FROM, to: [to], reply_to: REPLY_TO, subject, text }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload?.message || `Resend rejected the message (HTTP ${res.status})`);
  return payload?.id || null;
}
