import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, bad, created } from "@/lib/api";

export async function GET(req) {
  const { user, error } = await guard("tasks:view");
  if (error) return error;
  const sp = req.nextUrl.searchParams;
  const where = {};
  if (sp.get("status")) where.status = sp.get("status");
  if (sp.get("assignedTo") === "me") where.assignedTo = user.id;
  else if (sp.get("assignedTo")) where.assignedTo = Number(sp.get("assignedTo"));
  const tasks = await prisma.task.findMany({
    where,
    include: { assignee: { select: { id: true, name: true } } },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });
  return ok(tasks);
}

export async function POST(req) {
  const { user, error } = await guard("tasks:manage");
  if (error) return error;
  try {
    const b = await req.json();
    if (!b.title) return bad("Title is required");
    const task = await prisma.task.create({
      data: {
        title: b.title,
        description: b.description || null,
        status: b.status || "TODO",
        priority: b.priority || "MEDIUM",
        dueDate: b.dueDate || null,
        assignedTo: b.assignedTo ? Number(b.assignedTo) : user.id,
        createdBy: user.id,
      },
    });
    if (task.assignedTo && task.assignedTo !== user.id) {
      await prisma.notification.create({ data: { userId: task.assignedTo, text: `New task assigned to you: ${task.title}`, type: "TASK" } });
    }
    await audit(user, "TASK_CREATED", "Task", task.id, task.title);
    return created(task);
  } catch (e) {
    return bad(e.message);
  }
}
