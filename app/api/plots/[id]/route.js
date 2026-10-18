import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, bad } from "@/lib/api";
import { ensurePlotCertificateColumn } from "@/lib/provision";

export async function GET(req, { params }) {
  const { error } = await guard("plots:view");
  if (error) return error;
  const { id } = await params;
  await ensurePlotCertificateColumn();
  const plot = await prisma.plot.findUnique({
    where: { id: Number(id) },
    include: { project: true, member: true, payments: { orderBy: { date: "desc" } }, inquiries: true },
  });
  if (!plot) return bad("Plot not found", 404);
  return ok(plot);
}

export async function PUT(req, { params }) {
  const { user, error } = await guard("plots:manage");
  if (error) return error;
  const { id } = await params;
  const b = await req.json();
  const allowed = ["number", "sizeSqm", "price", "status", "description", "block"];
  const data = {};
  for (const k of allowed) if (k in b) data[k] = b[k];
  if ("price" in data) data.price = Number(data.price);
  if ("sizeSqm" in data) data.sizeSqm = Number(data.sizeSqm);
  // The certificate flag arrives as a boolean from the UI but is stored as the
  // moment it was issued, so the portal can show a date rather than a bare yes.
  if ("certificateIssued" in b) data.certificateIssuedAt = b.certificateIssued ? new Date() : null;
  // unassign member when moving away from SOLD/RESERVED
  if (data.status === "AVAILABLE") data.memberId = null;
  try {
    await ensurePlotCertificateColumn();
    const plot = await prisma.plot.update({ where: { id: Number(id) }, data });
    await audit(user, "PLOT_UPDATED", "Plot", plot.id, data);
    return ok(plot);
  } catch (e) {
    return bad(e.message);
  }
}

export async function DELETE(req, { params }) {
  const { user, error } = await guard("plots:manage");
  if (error) return error;
  const { id } = await params;
  try {
    await prisma.plot.delete({ where: { id: Number(id) } });
    await audit(user, "PLOT_DELETED", "Plot", id);
    return ok({ ok: true });
  } catch (e) {
    return bad("Cannot delete a plot with payments or inquiries attached");
  }
}
