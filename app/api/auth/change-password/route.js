import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getStaffSession, unauthorized } from "@/lib/auth";
import { ok, bad } from "@/lib/api";

export async function POST(req) {
  const session = await getStaffSession();
  if (!session) return unauthorized();
  try {
    const { currentPassword, newPassword } = await req.json();
    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!(await bcrypt.compare(currentPassword || "", user.password))) return bad("Current password is incorrect");
    if ((newPassword || "").length < 8) return bad("New password must be at least 8 characters");
    await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(newPassword, 10) } });
    return ok({ ok: true });
  } catch (e) {
    return bad(e.message);
  }
}
