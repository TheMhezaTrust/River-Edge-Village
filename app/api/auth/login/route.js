import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, setSessionCookie, STAFF_COOKIE, ROLES, VIEW963_OWNER } from "@/lib/auth";
import { ensureSuperAdmin } from "@/lib/super-admin";
import { ensureView963Owner, provisionView963Owner } from "@/lib/owner-account";
import { ok, bad } from "@/lib/api";

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    // The software owner's account is created from the environment, so it has to
    // exist before the credentials below are checked against it. Memoised and
    // never throws; a no-op when the owner variables are not configured.
    await provisionView963Owner();
    const user = await prisma.user.findUnique({ where: { email: (email || "").toLowerCase().trim() } });
    if (!user || !user.isActive || !(await bcrypt.compare(password || "", user.password))) {
      return bad("Invalid email or password", 401);
    }
    // Applies the backend-only designations. The software owner outranks the Main
    // Administrator, so it is resolved first and the other is skipped for it.
    let role = (await ensureView963Owner(user)) || user.role;
    if (role !== VIEW963_OWNER) role = (await ensureSuperAdmin(user)) || role;
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const token = await signToken({ scope: "staff", id: user.id, name: user.name, email: user.email, role });
    await setSessionCookie(STAFF_COOKIE, token);
    return ok({
      user: { id: user.id, name: user.name, email: user.email, role, roleLabel: ROLES[role], title: user.title, lastLoginAt: user.lastLoginAt },
    });
  } catch (e) {
    return bad(e.message);
  }
}
