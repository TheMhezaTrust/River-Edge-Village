import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { startPortalSession } from "@/lib/auth";
import { ok, bad } from "@/lib/api";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { ensureMemberAccessTables } from "@/lib/provision";

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    const address = String(email || "").toLowerCase().trim();
    const limited = rateLimit(`portal-login:${clientIp(req)}:${address}`, { limit: 8, windowMs: 5 * 60_000 });
    if (!limited.allowed) {
      const minutes = Math.max(1, Math.ceil(limited.retryAfterSeconds / 60));
      return bad(`Too many sign-in attempts. Please try again in ${minutes} minute(s).`, 429);
    }

    await ensureMemberAccessTables();
    const member = await prisma.member.findUnique({ where: { email: address } });
    if (!member || !member.password || !(await bcrypt.compare(password || "", member.password))) {
      return bad("Invalid email or password", 401);
    }
    if (!member.isActive) return bad("This member account is inactive. Please contact the Trust office.", 403);

    await startPortalSession(member);
    // Best-effort: a failed timestamp must not cost the member their session.
    await prisma.member.update({ where: { id: member.id }, data: { lastLoginAt: new Date() } }).catch(() => {});

    return ok({
      member: { id: member.id, name: member.fullName, email: member.email },
      mustChangePassword: member.mustChangePassword,
    });
  } catch (e) {
    return bad(e.message);
  }
}
