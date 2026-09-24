import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { guard, audit, ROLES } from "@/lib/auth";
import { ok, bad } from "@/lib/api";

export async function PUT(req, { params }) {
  const { user, error } = await guard("users:manage");
  if (error) return error;
  const { id } = await params;
  const b = await req.json();
  const data = {};
  for (const k of ["name", "title", "phone", "isActive"]) if (k in b) data[k] = b[k];
  if (b.role && ROLES[b.role]) data.role = b.role;
  if (b.password) {
    if (b.password.length < 8) return bad("Password must be at least 8 characters");
    data.password = await bcrypt.hash(b.password, 10);
  }
  const updated = await prisma.user.update({ where: { id: Number(id) }, data, select: { id: true, name: true, email: true, role: true, isActive: true } });
  await audit(user, "USER_UPDATED", "User", updated.id, data);
  return ok(updated);
}

export async function DELETE(req, { params }) {
  const { user, error } = await guard("users:manage");
  if (error) return error;
  const { id } = await params;
  if (Number(id) === user.id) return bad("You cannot delete your own account");
  await prisma.user.update({ where: { id: Number(id) }, data: { isActive: false } });
  await audit(user, "USER_DEACTIVATED", "User", id);
  return ok({ ok: true });
}
