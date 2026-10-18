import { prisma } from "@/lib/prisma";
import { ok, bad } from "@/lib/api";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { emailConfigured } from "@/lib/email";
import { sendMemberAccessLink } from "@/lib/member-access";

// The same answer whether or not the address is on the register, so the form
// cannot be used to discover which members exist.
const GENERIC =
  "If that email address is on the member register, a password link is on its way. It expires in 30 minutes.";

export async function POST(req) {
  const limited = rateLimit(`portal-forgot:${clientIp(req)}`, { limit: 5, windowMs: 60 * 60_000 });
  if (!limited.allowed) {
    return bad(`Too many requests. Please try again in ${limited.retryAfterSeconds} seconds.`, 429);
  }

  const b = await req.json().catch(() => ({}));
  const email = String(b.email || "").toLowerCase().trim();
  if (!email) return bad("Enter the email address registered with the Trust");

  // Per-address limit answers with the generic message too: a 429 here would
  // confirm that the address belongs to a member.
  const perAddress = rateLimit(`portal-forgot:${email}`, { limit: 3, windowMs: 60 * 60_000 });
  if (perAddress.allowed && emailConfigured()) {
    const member = await prisma.member.findFirst({
      where: { email, isActive: true },
      select: { id: true, fullName: true, email: true, isActive: true },
    });
    if (member) {
      try {
        await sendMemberAccessLink({ member, purpose: "RESET" });
      } catch (e) {
        console.error(`[portal:forgot] reset link for member #${member.id} failed:`, e?.message || e);
      }
    }
  } else if (!emailConfigured()) {
    console.error("[portal:forgot] outbound email is not configured (RESEND_API_KEY is missing)");
  }

  return ok({ message: GENERIC });
}
