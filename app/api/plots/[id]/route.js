import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, bad } from "@/lib/api";
import { ensurePlotCertificateColumn, ensureMemberRecordColumns } from "@/lib/provision";

export async function GET(req, { params }) {
  const { error } = await guard("plots:view");
  if (error) return error;
  const { id } = await params;
  await Promise.all([ensurePlotCertificateColumn(), ensureMemberRecordColumns()]);
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

  if ("price" in data) {
    const n = Number(data.price);
    if (data.price === "" || Number.isNaN(n) || n < 0) return bad("Price must be zero or more.");
    data.price = n;
  }
  if ("sizeSqm" in data) {
    const n = Number(data.sizeSqm);
    if (!Number.isInteger(n) || n <= 0) return bad("Size must be a whole number of square metres.");
    data.sizeSqm = n;
  }
  if ("number" in data) {
    data.number = String(data.number ?? "").trim();
    if (!data.number) return bad("A plot number is required.");
  }
  // The certificate flag arrives as a boolean from the UI but is stored as the
  // moment it was issued, so the portal can show a date rather than a bare yes.
  if ("certificateIssued" in b) data.certificateIssuedAt = b.certificateIssued ? new Date() : null;
  if ("purchasedAt" in b) {
    if (!b.purchasedAt) data.purchasedAt = null;
    else {
      const d = new Date(b.purchasedAt);
      if (Number.isNaN(d.getTime())) return bad("Date of purchase is not a valid date.");
      data.purchasedAt = d;
    }
  }

  await Promise.all([ensurePlotCertificateColumn(), ensureMemberRecordColumns()]);

  // Reassigning the holder is what lets the member record be corrected against
  // the signed contract, so the member has to exist and the plot cannot end up
  // both held and available.
  if ("memberId" in b) {
    const next = b.memberId === "" || b.memberId == null ? null : Number(b.memberId);
    if (next === null) {
      data.memberId = null;
      if (!("status" in data)) data.status = "AVAILABLE";
    } else {
      if (!Number.isInteger(next)) return bad("That member does not exist.");
      const holder = await prisma.member.findUnique({ where: { id: next }, select: { id: true } });
      if (!holder) return bad("That member does not exist.", 404);
      data.memberId = next;
      if (!("status" in data)) data.status = "SOLD";
    }
  }
  if (data.status === "AVAILABLE") data.memberId = null;

  const plotId = Number(id);
  if (data.number != null) {
    const current = await prisma.plot.findUnique({ where: { id: plotId }, select: { projectId: true, number: true } });
    if (!current) return bad("Plot not found", 404);
    if (data.number !== current.number) {
      const clash = await prisma.plot.findFirst({
        where: { projectId: current.projectId, number: data.number, id: { not: plotId } },
        select: { id: true },
      });
      if (clash) return bad(`Plot ${data.number} already exists in this project.`);
    }
  }

  try {
    const plot = await prisma.plot.update({ where: { id: plotId }, data });
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
