import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { guard, audit, SUPER_ADMIN, VIEW963_OWNER } from "@/lib/auth";
import { ASSIGNABLE_ROLES } from "@/lib/roles";
import { ok, bad } from "@/lib/api";

export async function PUT(req, { params }) {
  const { user, error } = await guard("users:manage");
  if (error) return error;
  const { id } = await params;
  const b = await req.json();
  const target = await prisma.user.findUnique({ where: { id: Number(id) }, select: { role: true } });
  if (!target) return bad("User not found", 404);
  // The software owner's account outranks every administrator, so nothing about it
  // may be changed from here — least of all its password, which would let an
  // administrator sign in as the owner. The wording is deliberately neutral: the
  // staff directory does not disclose which account holds the role.
  if (target.role === VIEW963_OWNER) return bad("This account cannot be changed from the workstation");
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
  return ok({ ...updated, role: maskRole(updated.role) });
}

export async function DELETE(req, { params }) {
  const { user, error } = await guard("users:manage");
  if (error) return error;
  const { id } = await params;
  if (Number(id) === user.id) return bad("You cannot delete your own account");
  const target = await prisma.user.findUnique({ where: { id: Number(id) }, select: { role: true } });
  if (target?.role === SUPER_ADMIN || target?.role === VIEW963_OWNER) {
    return bad("This account cannot be deactivated");
  }
  await prisma.user.update({ where: { id: Number(id) }, data: { isActive: false } });
  await audit(user, "USER_DEACTIVATED", "User", id);
  return ok({ ok: true });
}

// Both backend-only designations are reported to the staff directory as a plain
// administrator role, so neither the label nor the raw value reveals which account
// holds them.
function maskRole(role) {
  return role === SUPER_ADMIN || role === VIEW963_OWNER ? "ADMIN" : role;
}
