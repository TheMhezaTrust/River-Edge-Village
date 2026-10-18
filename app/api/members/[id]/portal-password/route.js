import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { guard, audit, verifyConfirmToken } from "@/lib/auth";
import { ok, bad } from "@/lib/api";
import { generateTempPassword } from "@/lib/member-access";
import { ensureMemberAccessTables } from "@/lib/provision";

// Fallback for a member who cannot receive the emailed link: the office sets a
// temporary password and relays it by hand. The member must change it on first
// sign-in, and the plain password is returned once — never stored, never logged.
export async function POST(req, { params }) {
  const { user, error } = await guard("members:manage");
  if (error) return error;
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  if (!(await verifyConfirmToken(b.confirmToken))) {
    return bad("Password confirmation required or expired. Please try again.", 401);
  }

  const member = await prisma.member.findUnique({
    where: { id: Number(id) },
    select: { id: true, fullName: true, isActive: true },
  });
  if (!member) return bad("Member not found", 404);
  if (!member.isActive) return bad("This member account is inactive, so portal access cannot be issued");

  const tempPassword = generateTempPassword();
  await ensureMemberAccessTables();
  await prisma.member.update({
    where: { id: member.id },
    data: { password: await bcrypt.hash(tempPassword, 10), mustChangePassword: true },
  });
  await audit(user, "MEMBER_TEMP_PASSWORD_SET", "Member", member.id, member.fullName);
  return ok({ tempPassword, mustChangePassword: true });
}
