import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { bad, created } from "@/lib/api";
import { emailConfigured, sendMail } from "@/lib/email";
import { ensureInquiryReplyTable } from "@/lib/provision";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY = 5000;

export async function POST(req, { params }) {
  const { user, error } = await guard("inquiries:manage");
  if (error) return error;
  const { id } = await params;
  const b = await req.json().catch(() => ({}));

  const message = String(b.message || "").trim();
  if (!message) return bad("Write a message before sending");
  if (message.length > MAX_BODY) return bad(`Message must be ${MAX_BODY} characters or fewer`);
  if (!emailConfigured()) {
    return bad("Outbound email is not configured on this server yet (RESEND_API_KEY).", 503);
  }

  const inquiry = await prisma.inquiry.findUnique({
    where: { id: Number(id) },
    select: { id: true, name: true, email: true, status: true },
  });
  if (!inquiry) return bad("Inquiry not found", 404);
  const to = String(inquiry.email || "").trim();
  if (!EMAIL_RE.test(to)) return bad("This inquiry has no valid email address to reply to");

  const subject = String(b.subject || "").trim().slice(0, 200) || "Re: your inquiry to The Mheza Trust";
  await ensureInquiryReplyTable();

  // The send is attempted before anything is written, so the history only ever
  // claims an email went out when the provider accepted it. A failure is still
  // recorded — staff need to know the customer was not reached, and why.
  let providerId = null;
  let failure = null;
  try {
    providerId = await sendMail({ to, subject, text: message });
  } catch (e) {
    failure = e?.message || "The email could not be sent";
  }

  await prisma.inquiryReply.create({
    data: {
      inquiryId: inquiry.id,
      toEmail: to,
      subject,
      body: message,
      status: failure ? "FAILED" : "SENT",
      providerId,
      error: failure,
      sentById: user.id,
    },
  });

  let status = inquiry.status;
  if (!failure && status === "NEW") {
    await prisma.inquiry.update({ where: { id: inquiry.id }, data: { status: "CONTACTED" } });
    status = "CONTACTED";
  }

  await audit(user, failure ? "INQUIRY_REPLY_FAILED" : "INQUIRY_REPLY_SENT", "Inquiry", inquiry.id, {
    to,
    subject,
    providerId,
    error: failure,
  });

  if (failure) return bad(failure, 502);
  return created({ status, to, subject, sentAt: new Date().toISOString() });
}
