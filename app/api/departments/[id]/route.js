import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, bad } from "@/lib/api";

export async function PUT(req, { params }) {
  const { user, error } = await guard("departments:manage");
  if (error) return error;
  const { id } = await params;
  const b = await req.json();
  const allowed = ["name", "contactPerson", "phone", "email", "status", "notes", "followUpDate"];
  const data = {};
  for (const k of allowed) if (k in b) data[k] = b[k];
  const dept = await prisma.department.update({ where: { id: Number(id) }, data });
  await audit(user, "DEPARTMENT_UPDATED", "Department", dept.id, data);
  return ok(dept);
}

export async function DELETE(req, { params }) {
  const { user, error } = await guard("departments:manage");
  if (error) return error;
  const { id } = await params;
  await prisma.department.delete({ where: { id: Number(id) } });
  await audit(user, "DEPARTMENT_DELETED", "Department", id);
  return ok({ ok: true });
}
