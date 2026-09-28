import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { guard, audit, SUPER_ADMIN } from "@/lib/auth";
import { ASSIGNABLE_ROLES } from "@/lib/roles";
import { ok, bad } from "@/lib/api";

export async function PUT(req, { params }) {
  const { user, error } = await guard("users:manage");
  if (error) return error;
  const { id } = await params;
  const b = await req.json();
  const target = await prisma.user.findUnique({ where: { id: Number(id) }, select: { role: true } });
  if (!target) return bad("User not found", 404);
  // The Main Administrator designation is backend-only (lib/super-admin.js): it
  // can be neither granted to another account nor taken away from this one here.
  const isDesignated = target.role === SUPER_ADMIN;
  if (isDesignated && b.isActive === false) return bad("This account cannot be deactivated");
  const data = {};
  for (const k of ["name", "title", "phone", "isActive"]) if (k in b) data[k] = b[k];
  if (b.role && ASSIGNABLE_ROLES[b.role] && !isDesignated) data.role = b.role;
  if (b.password) {
    if (b.password.length < 8) return bad("Password must be at least 8 characters");
    data.password = await bcrypt.hash(b.password, 10);
  }
  const updated = await prisma.user.update({ where: { id: Number(id) }, data, select: { id: true, name: true, email: true, role: true, isActive: true } });
  await audit(user, "USER_UPDATED", "User", updated.id, data);
  return ok({ ...updated, role: updated.role === SUPER_ADMIN ? "ADMIN" : updated.role });
}

export async function DELETE(req, { params }) {
  const { user, error } = await guard("users:manage");
  if (error) return error;
  const { id } = await params;
  if (Number(id) === user.id) return bad("You cannot delete your own account");
  const target = await prisma.user.findUnique({ where: { id: Number(id) }, select: { role: true } });
  if (target?.role === SUPER_ADMIN) return bad("This account cannot be deactivated");
  await prisma.user.update({ where: { id: Number(id) }, data: { isActive: false } });
  await audit(user, "USER_DEACTIVATED", "User", id);
  return ok({ ok: true });
}
