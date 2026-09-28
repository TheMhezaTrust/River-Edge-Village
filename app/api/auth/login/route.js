import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, setSessionCookie, STAFF_COOKIE, ROLES } from "@/lib/auth";
import { ensureSuperAdmin } from "@/lib/super-admin";
import { ok, bad } from "@/lib/api";

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    const user = await prisma.user.findUnique({ where: { email: (email || "").toLowerCase().trim() } });
    if (!user || !user.isActive || !(await bcrypt.compare(password || "", user.password))) {
      return bad("Invalid email or password", 401);
    }
    // Applies the Main Administrator designation for the designated account.
    const role = (await ensureSuperAdmin(user)) || user.role;
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
