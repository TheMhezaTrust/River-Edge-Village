import { prisma } from "@/lib/prisma";
import { getActivePortalMember, unauthorized, audit } from "@/lib/auth";
import { ok, bad, created } from "@/lib/api";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { ensureMemberAccessTables } from "@/lib/provision";

// Which identity fields a member may ask to have changed. Their name and ID number
// are what the Trust's plot records and the sale agreement are built on, so the
// office decides — the member can only request.
const FIELDS = {
  fullName: { label: "Full name", column: "fullName", max: 120 },
  idNumber: { label: "ID number", column: "idNumber", max: 30 },
};

export async function GET() {
  const member = await getActivePortalMember();
  if (!member) return unauthorized();
  await ensureMemberAccessTables();
  const requests = await prisma.memberChangeRequest.findMany({
    where: { memberId: member.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, field: true, currentValue: true, proposedValue: true, reason: true, status: true, createdAt: true, decidedAt: true },
  });
  return ok(requests);
}

export async function POST(req) {
  const member = await getActivePortalMember();
  if (!member) return unauthorized();

  const limit = rateLimit(`portal-change:${clientIp(req)}:${member.id}`, { limit: 10, windowMs: 60 * 60_000 });
  if (!limit.allowed) return bad(`Too many requests. Please try again in ${limit.retryAfterSeconds} seconds.`, 429);

  const b = await req.json();
  const spec = FIELDS[b.field];
  if (!spec) return bad("Unknown field.");

  const proposed = String(b.proposedValue ?? "").trim();
  if (!proposed) return bad(`Enter the corrected ${spec.label.toLowerCase()}.`);
  if (proposed.length > spec.max) return bad(`That ${spec.label.toLowerCase()} is too long.`);

  await ensureMemberAccessTables();
  const current = await prisma.member.findUnique({
    where: { id: member.id },
    select: { fullName: true, idNumber: true },
  });
  const currentValue = current?.[spec.column] ?? "";
  if (proposed === currentValue) return bad(`That is already the ${spec.label.toLowerCase()} we hold.`);

  const pending = await prisma.memberChangeRequest.findFirst({
    where: { memberId: member.id, field: b.field, status: "PENDING" },
    select: { id: true },
  });
  if (pending) return bad(`You already have a ${spec.label.toLowerCase()} change waiting for the Trust to review.`);

  const reason = String(b.reason ?? "").trim().slice(0, 500) || null;

  const request = await prisma.memberChangeRequest.create({
    data: { memberId: member.id, field: b.field, currentValue, proposedValue: proposed, reason },
    select: { id: true, field: true, currentValue: true, proposedValue: true, reason: true, status: true, createdAt: true },
  });

  // userId is null, which is how a notification reaches every staff account rather
  // than one person — nobody owns the member register individually.
  await prisma.notification.create({
    data: {
      text: `${member.fullName} requested a ${spec.label.toLowerCase()} change in the member portal`,
      type: "MEMBER_CHANGE",
    },
  });
  await audit(null, "MEMBER_CHANGE_REQUESTED", "Member", member.id, { field: b.field });

  return created(request);
}
