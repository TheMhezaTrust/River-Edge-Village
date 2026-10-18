import { prisma } from "@/lib/prisma";
import { guard, audit, verifyConfirmToken } from "@/lib/auth";
import { ok, bad } from "@/lib/api";
import { emailConfigured, EMAIL_RE } from "@/lib/email";
import { sendMemberAccessLink } from "@/lib/member-access";

// Sends a member a single-use link to set their own portal password: ACTIVATE for
// a first invitation, RESET when the office is answering "I forgot my password".
// The link is never returned to the caller — it only ever travels by email.
export async function POST(req, { params }) {
  const { user, error } = await guard("members:manage");
  if (error) return error;
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  if (!(await verifyConfirmToken(b.confirmToken))) {
    return bad("Password confirmation required or expired. Please try again.", 401);
  }
  if (!emailConfigured()) {
    return bad("Outbound email is not configured on this server yet (RESEND_API_KEY). Set a temporary password instead.", 503);
  }

  const purpose = b.purpose === "RESET" ? "RESET" : "ACTIVATE";
  const member = await prisma.member.findUnique({
    where: { id: Number(id) },
    select: { id: true, fullName: true, email: true, isActive: true },
  });
  if (!member) return bad("Member not found", 404);
  if (!member.isActive) return bad("This member account is inactive, so portal access cannot be issued");
  if (!EMAIL_RE.test(member.email || "")) {
    return bad("This member has no valid email address, so a link cannot be sent. Set a temporary password instead.");
  }

  try {
    const { expiresAt } = await sendMemberAccessLink({ member, purpose, createdById: user.id });
    await audit(
      user,
      purpose === "RESET" ? "MEMBER_PORTAL_RESET_SENT" : "MEMBER_PORTAL_INVITE_SENT",
      "Member",
      member.id,
      { email: member.email },
    );
    return ok({ sent: true, expiresAt });
  } catch (e) {
    return bad(e?.message || "The email could not be sent", 502);
  }
}
