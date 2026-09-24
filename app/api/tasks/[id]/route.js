import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, bad } from "@/lib/api";

export async function PUT(req, { params }) {
  const { user, error } = await guard("tasks:manage");
  if (error) return error;
  const { id } = await params;
  const b = await req.json();
  const allowed = ["title", "description", "status", "priority", "dueDate", "assignedTo"];
  const data = {};
  for (const k of allowed) if (k in b) data[k] = b[k] === "" ? null : b[k];
  if ("assignedTo" in b) data.assignedTo = b.assignedTo ? Number(b.assignedTo) : null;
  const task = await prisma.task.update({ where: { id: Number(id) }, data });
  await audit(user, "TASK_UPDATED", "Task", task.id, data);
  return ok(task);
}

export async function DELETE(req, { params }) {
  const { user, error } = await guard("tasks:manage");
  if (error) return error;
  const { id } = await params;
  await prisma.task.delete({ where: { id: Number(id) } });
  await audit(user, "TASK_DELETED", "Task", id);
  return ok({ ok: true });
}
