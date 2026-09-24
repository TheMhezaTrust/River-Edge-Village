import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, bad } from "@/lib/api";

export async function GET(req, { params }) {
  const { error } = await guard("inquiries:view");
  if (error) return error;
  const { id } = await params;
  const inquiry = await prisma.inquiry.findUnique({
    where: { id: Number(id) },
    include: { plot: true, assignee: { select: { id: true, name: true, email: true } } },
  });
  if (!inquiry) return bad("Inquiry not found", 404);
  return ok(inquiry);
}

export async function PUT(req, { params }) {
  const { user, error } = await guard("inquiries:manage");
  if (error) return error;
  const { id } = await params;
  const b = await req.json();
  const allowed = ["status", "assignedTo", "followUpDate", "notes", "name", "email", "phone", "message"];
  const data = {};
  for (const k of allowed) if (k in b) data[k] = b[k] === "" ? null : b[k];
  if ("assignedTo" in b) data.assignedTo = b.assignedTo ? Number(b.assignedTo) : null;
  const inquiry = await prisma.inquiry.update({ where: { id: Number(id) }, data });
  await audit(user, "INQUIRY_UPDATED", "Inquiry", inquiry.id, data);
  return ok(inquiry);
}

export async function DELETE(req, { params }) {
  const { user, error } = await guard("inquiries:manage");
  if (error) return error;
  const { id } = await params;
  await prisma.inquiry.delete({ where: { id: Number(id) } });
  await audit(user, "INQUIRY_DELETED", "Inquiry", id);
  return ok({ ok: true });
}
