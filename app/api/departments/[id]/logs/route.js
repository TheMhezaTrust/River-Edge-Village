import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, bad, created } from "@/lib/api";

export async function POST(req, { params }) {
  const { user, error } = await guard("departments:manage");
  if (error) return error;
  const { id } = await params;
  const b = await req.json();
  if (!b.summary) return bad("Summary is required");
  const log = await prisma.departmentLog.create({
    data: {
      date: b.date ? new Date(b.date) : new Date(),
      method: b.method || "EMAIL",
      summary: b.summary,
      nextSteps: b.nextSteps || null,
      departmentId: Number(id),
    },
  });
  await audit(user, "DEPARTMENT_LOG_CREATED", "DepartmentLog", log.id, b.summary);
  return created(log);
}
