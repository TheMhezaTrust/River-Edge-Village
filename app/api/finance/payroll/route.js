import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, bad, created } from "@/lib/api";

export async function GET() {
  const { error } = await guard("payroll:view");
  if (error) return error;
  const employees = await prisma.employee.findMany({ orderBy: { name: "asc" } });
  return ok(
    employees.map((e) => ({
      ...e,
      netPay: e.salary - e.paye - e.uif - e.sdl,
      employerCost: e.salary + e.uif * 2 + e.sdl,
    }))
  );
}

export async function POST(req) {
  const { user, error } = await guard("payroll:manage");
  if (error) return error;
  try {
    const b = await req.json();
    if (!b.name || !b.jobTitle || b.salary == null) return bad("Name, job title and salary are required");
    const emp = await prisma.employee.create({
      data: {
        name: b.name,
        jobTitle: b.jobTitle,
        salary: Number(b.salary),
        paye: Number(b.paye || 0),
        uif: Number(b.uif || 0),
        sdl: Number(b.sdl || 0),
        startDate: b.startDate || null,
      },
    });
    await audit(user, "EMPLOYEE_CREATED", "Employee", emp.id, emp.name);
    return created(emp);
  } catch (e) {
    return bad(e.message);
  }
}

export async function DELETE(req) {
  const { user, error } = await guard("payroll:manage");
  if (error) return error;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return bad("id is required");
  await prisma.employee.delete({ where: { id: Number(id) } });
  await audit(user, "EMPLOYEE_DELETED", "Employee", id);
  return ok({ ok: true });
}
