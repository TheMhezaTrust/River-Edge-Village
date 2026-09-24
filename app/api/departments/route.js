import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, bad, created } from "@/lib/api";

export async function GET() {
  const { error } = await guard("departments:view");
  if (error) return error;
  const departments = await prisma.department.findMany({
    include: { logs: { orderBy: { date: "desc" }, take: 20 } },
    orderBy: { name: "asc" },
  });
  return ok(departments);
}

export async function POST(req) {
  const { user, error } = await guard("departments:manage");
  if (error) return error;
  try {
    const b = await req.json();
    if (!b.name) return bad("Department name is required");
    const dept = await prisma.department.create({
      data: {
        name: b.name,
        contactPerson: b.contactPerson || null,
        phone: b.phone || null,
        email: b.email || null,
        status: b.status || "PENDING",
        notes: b.notes || null,
        followUpDate: b.followUpDate || null,
      },
    });
    await audit(user, "DEPARTMENT_CREATED", "Department", dept.id, dept.name);
    return created(dept);
  } catch (e) {
    return bad(e.message);
  }
}
