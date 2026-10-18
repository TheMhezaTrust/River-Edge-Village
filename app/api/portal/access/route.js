import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { audit, startPortalSession } from "@/lib/auth";
import { ok, bad } from "@/lib/api";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { readMemberToken, consumeMemberToken } from "@/lib/member-access";
import { ensureMemberAccessTables } from "@/lib/provision";

// Sets a member's portal password from an emailed link and signs them in. The
// token is consumed after the write succeeds, so a failed attempt can be retried
// with the same link until it expires.
export async function POST(req) {
  const limited = rateLimit(`portal-access:${clientIp(req)}`, { limit: 10, windowMs: 60 * 60_000 });
  if (!limited.allowed) {
    return bad(`Too many attempts. Please try again in ${limited.retryAfterSeconds} seconds.`, 429);
  }

  const b = await req.json().catch(() => ({}));
  const password = String(b.password || "");
  if (password.length < 8) return bad("Choose a password of at least 8 characters");
  if (password.length > 200) return bad("That password is too long");

  const row = await readMemberToken(b.token);
  if (!row) return bad("This link is no longer valid. Please ask the Trust office to send a new one.");

  await ensureMemberAccessTables();
  await prisma.member.update({
    where: { id: row.memberId },
    data: { password: await bcrypt.hash(password, 10), mustChangePassword: false, lastLoginAt: new Date() },
  });
  await consumeMemberToken(row.id);
  await startPortalSession(row.member);
  await audit(null, "MEMBER_PASSWORD_SET", "Member", row.memberId, { purpose: row.purpose });
  return ok({ ok: true });
}
