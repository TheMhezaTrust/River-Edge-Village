import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getActivePortalSession, unauthorized } from "@/lib/auth";
import { ok, bad } from "@/lib/api";

export async function POST(req) {
  const session = await getActivePortalSession();
  if (!session) return unauthorized();
  const { currentPassword, newPassword } = await req.json();
  const member = await prisma.member.findUnique({ where: { id: session.id } });
  if (member.password && !(await bcrypt.compare(currentPassword || "", member.password))) {
    return bad("Current password is incorrect");
  }
  if ((newPassword || "").length < 8) return bad("New password must be at least 8 characters");
  await prisma.member.update({ where: { id: member.id }, data: { password: await bcrypt.hash(newPassword, 10) } });
  return ok({ ok: true });
}
