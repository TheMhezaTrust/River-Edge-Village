import { prisma } from "@/lib/prisma";
import { guard, audit, verifyConfirmToken } from "@/lib/auth";
import { ok, bad } from "@/lib/api";
import { buildProjectData } from "../route.js";

export async function GET(req, { params }) {
  const { error } = await guard("projects:view");
  if (error) return error;
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id: Number(id) }, include: { _count: { select: { plots: true } } } });
  if (!project) return bad("Project not found", 404);
  return ok(project);
}

export async function PUT(req, { params }) {
  const { user, error } = await guard("projects:manage");
  if (error) return error;
  const { id } = await params;
  try {
    const b = await req.json();
    if (!(await verifyConfirmToken(b.confirmToken))) {
      return bad("Password confirmation required or expired. Please try again.", 401);
    }
    const { data, errors } = buildProjectData(b, { partial: true });
    if (errors.length) return bad(`Invalid fields: ${errors.join(", ")}`);
    const project = await prisma.project.update({ where: { id: Number(id) }, data });
    await audit(user, "PROJECT_UPDATED", "Project", project.id, project.name);
    return ok(project);
  } catch (e) {
    return bad(e.code === "P2025" ? "Project not found" : e.message);
  }
}

export async function DELETE(req, { params }) {
  const { user, error } = await guard("projects:manage");
  if (error) return error;
  const { id } = await params;
  try {
    const token = req.nextUrl.searchParams.get("confirmToken") || (await req.json().catch(() => ({}))).confirmToken;
    if (!(await verifyConfirmToken(token))) {
      return bad("Password confirmation required or expired. Please try again.", 401);
    }
    const projectId = Number(id);
    const plotCount = await prisma.plot.count({ where: { projectId } });
    if (plotCount > 0) return bad(`This project still has ${plotCount} plot(s). Remove or reassign them before deleting the project.`);
    await prisma.project.delete({ where: { id: projectId } });
    await audit(user, "PROJECT_DELETED", "Project", projectId);
    return ok({ ok: true });
  } catch (e) {
    return bad(e.code === "P2025" ? "Project not found" : e.message);
  }
}
