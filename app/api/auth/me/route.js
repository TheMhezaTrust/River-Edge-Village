import { prisma } from "@/lib/prisma";
import { getStaffSession, ROLES, ROLE_PERMISSIONS, unauthorized } from "@/lib/auth";
import { ok } from "@/lib/api";

export async function GET() {
  const session = await getStaffSession();
  if (!session) return unauthorized();
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, name: true, email: true, role: true, title: true, phone: true, lastLoginAt: true, isActive: true },
  });
  if (!user || !user.isActive) return unauthorized();
  return ok({ ...user, roleLabel: ROLES[user.role], permissions: ROLE_PERMISSIONS[user.role] || [] });
}
