import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getActivePortalSession, unauthorized, audit } from "@/lib/auth";
import { ok, bad } from "@/lib/api";
import { ensureMemberAccessTables } from "@/lib/provision";

export async function POST(req) {
  const session = await getActivePortalSession();
  if (!session) return unauthorized();
  const { currentPassword, newPassword } = await req.json();
  await ensureMemberAccessTables();
  const member = await prisma.member.findUnique({ where: { id: session.id } });
  if (member.password && !(await bcrypt.compare(currentPassword || "", member.password))) {
    return bad("Current password is incorrect");
  }
  if ((newPassword || "").length < 8) return bad("New password must be at least 8 characters");
  if ((newPassword || "").length > 200) return bad("That password is too long");
  await prisma.member.update({
    where: { id: member.id },
    data: { password: await bcrypt.hash(newPassword, 10), mustChangePassword: false },
  });
  await audit(null, "MEMBER_PASSWORD_CHANGED", "Member", member.id);
  return ok({ ok: true });
}
