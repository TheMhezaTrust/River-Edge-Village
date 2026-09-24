import { prisma } from "@/lib/prisma";
import { getActivePortalSession, unauthorized } from "@/lib/auth";
import { ok } from "@/lib/api";
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
  const allowed = ["phone", "physicalAddress", "postalAddress", "beneficiaries"];
  const data = {};
  for (const key of allowed) if (key in body) data[key] = body[key];
  const member = await prisma.member.update({ where: { id: session.id }, data });
  return ok({ id: member.id, phone: member.phone });
}
