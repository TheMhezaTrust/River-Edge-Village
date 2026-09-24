import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, bad } from "@/lib/api";
import { memberTotals } from "@/lib/member-totals";

export async function GET(req, { params }) {
  const { error } = await guard("members:view");
  if (error) return error;
  const { id } = await params;
  const member = await prisma.member.findUnique({
    where: { id: Number(id) },
    include: { plots: { include: { project: true } }, payments: { orderBy: { date: "desc" } } },
  });
  if (!member) return bad("Member not found", 404);
  const { password, ...safe } = member;
  const { price, totalPaid, outstandingBalance } = memberTotals(member);
  return ok({ ...safe, price, totalPaid, outstandingBalance });
}

export async function PUT(req, { params }) {
  const { user, error } = await guard("members:manage");
  if (error) return error;
  const { id } = await params;
  const b = await req.json();
  const allowed = ["fullName", "idNumber", "dateOfBirth", "gender", "maritalStatus", "physicalAddress", "postalAddress", "phone", "email", "purchasePrice", "paymentPlan", "notes", "isActive"];
  const data = {};
  for (const k of allowed) if (k in b) data[k] = b[k];
  if ("beneficiaries" in b) data.beneficiaries = typeof b.beneficiaries === "string" ? b.beneficiaries : JSON.stringify(b.beneficiaries);
  if (data.purchasePrice != null) data.purchasePrice = Number(data.purchasePrice);
  try {
    const member = await prisma.member.update({ where: { id: Number(id) }, data });
    await audit(user, "MEMBER_UPDATED", "Member", member.id, member.fullName);
    return ok(member);
  } catch (e) {
    return bad(e.message);
  }
}

export async function DELETE(req, { params }) {
  const { user, error } = await guard("members:manage");
  if (error) return error;
  const { id } = await params;
  const memberId = Number(id);
  await prisma.plot.updateMany({ where: { memberId }, data: { memberId: null, status: "AVAILABLE" } });
  await prisma.payment.deleteMany({ where: { memberId } });
  await prisma.memberDocument.deleteMany({ where: { memberId } });
  await prisma.member.delete({ where: { id: memberId } });
  await audit(user, "MEMBER_DELETED", "Member", memberId);
  return ok({ ok: true });
}
