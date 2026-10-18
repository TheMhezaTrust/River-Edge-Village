import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, bad } from "@/lib/api";
import { memberTotals } from "@/lib/member-totals";
import { ensureMemberRecordColumns } from "@/lib/provision";

export async function GET(req, { params }) {
  const { error } = await guard("members:view");
  if (error) return error;
  const { id } = await params;
  // The client selects Member.purchaseDate and Plot.purchasedAt, so on a cold start
  // the columns have to exist before this query rather than merely having been asked for.
  await ensureMemberRecordColumns();
  const member = await prisma.member.findUnique({
    where: { id: Number(id) },
    include: { plots: { include: { project: true } }, payments: { orderBy: { date: "desc" } } },
  });
  if (!member) return bad("Member not found", 404);
  const { password, ...safe } = member;
  const { price, totalPaid, outstandingBalance } = memberTotals(member);
  // Staff need to know whether a member can sign in yet, but the hash itself never
  // leaves the server.
  return ok({ ...safe, price, totalPaid, outstandingBalance, hasPortalPassword: Boolean(password) });
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
  // An empty field means "no override, fall back to the sum of the plot prices" —
  // not R0, which would wipe the member's balance from every screen.
  if ("purchasePrice" in b) {
    const raw = b.purchasePrice;
    if (raw === "" || raw == null) data.purchasePrice = null;
    else {
      const n = Number(raw);
      if (Number.isNaN(n) || n < 0) return bad("Purchase price must be zero or more.");
      data.purchasePrice = n;
    }
  }
  // Handled separately from `allowed`: it arrives as "YYYY-MM-DD" from a date
  // input and has to become a Date, or null when the contract date is unknown.
  if ("purchaseDate" in b) {
    if (!b.purchaseDate) data.purchaseDate = null;
    else {
      const d = new Date(b.purchaseDate);
      if (Number.isNaN(d.getTime())) return bad("Date of purchase is not a valid date.");
      data.purchaseDate = d;
    }
  }
  await ensureMemberRecordColumns();
  try {
    const member = await prisma.member.update({ where: { id: Number(id) }, data });
    await audit(user, "MEMBER_UPDATED", "Member", member.id, member.fullName);
    const { password: _password, ...safe } = member;
    return ok(safe);
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
