import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getActivePortalSession, unauthorized, audit } from "@/lib/auth";
import { ok, bad } from "@/lib/api";
import { EMAIL_RE } from "@/lib/email";
import { memberTotals } from "@/lib/member-totals";

export async function GET() {
  const session = await getActivePortalSession();
  if (!session) return unauthorized();
  const member = await prisma.member.findUnique({
    where: { id: session.id },
    include: {
      plots: { include: { project: { select: { name: true, slug: true, promoEndsAt: true } } } },
      payments: { orderBy: { date: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!member) return unauthorized();
  const { password, ...safe } = member;
  const { totalPaid, outstandingBalance } = memberTotals(member);
  return ok({ ...safe, totalPaid, outstandingBalance });
}

export async function PUT(req) {
  const session = await getActivePortalSession();
  if (!session) return unauthorized();
  const body = await req.json();

  // A member may keep their own contact details current. Their email is also their
  // login, so changing it has to be proved with the current password, and the new
  // address must not already belong to somebody else. Beneficiaries are deliberately
  // not here: those change only on a signed nomination form the office processes.
  const allowed = ["phone", "physicalAddress", "postalAddress"];
  const data = {};
  for (const key of allowed) if (key in body) data[key] = String(body[key] ?? "").trim();

  if (body.email != null) {
    const email = String(body.email).trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return bad("Enter a valid email address.");
    const current = await prisma.member.findUnique({
      where: { id: session.id },
      select: { email: true, password: true },
    });
    if (email !== (current?.email || "").toLowerCase()) {
      if (!body.currentPassword) return bad("Enter your current password to change your email address.");
      if (!current?.password || !(await bcrypt.compare(body.currentPassword, current.password))) {
        return bad("Your current password is not correct.");
      }
      const clash = await prisma.member.findFirst({ where: { email, id: { not: session.id } }, select: { id: true } });
      if (clash) return bad("That email address is already used by another member account.");
      data.email = email;
    }
  }

  const member = await prisma.member.update({ where: { id: session.id }, data });
  await audit(null, "MEMBER_SELF_UPDATED", "Member", member.id, Object.keys(data).join(", "));
  return ok({ id: member.id, email: member.email, phone: member.phone });
}
