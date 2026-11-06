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

// Beneficiaries are not a single column value but a list, so they are validated on
// their own path below. A member may nominate up to this many.
const MAX_BENEFICIARIES = 10;

// Normalises the submitted beneficiary list into the same shape the Trust stores
// ({ name, idNumber, relation, share }). Returns null when the list is not valid, so
// the caller can reject the request rather than queue something the office cannot read.
function normalizeBeneficiaries(input) {
  let list = input;
  if (typeof list === "string") {
    try {
      list = JSON.parse(list);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(list) || list.length === 0 || list.length > MAX_BENEFICIARIES) return null;
  const out = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") return null;
    const name = String(raw.name ?? "").trim();
    if (!name) return null;
    out.push({
      name: name.slice(0, 120),
      idNumber: String(raw.idNumber ?? "").trim().slice(0, 30),
      relation: String(raw.relation ?? "").trim().slice(0, 60),
      share: String(raw.share ?? "").trim().slice(0, 20),
    });
  }
  return out;
}

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

  // A beneficiary change is queued, never applied directly: the Trust decides who
  // inherits a Right of Use, so the office approves it from the workstation.
  if (b.field === "beneficiaries") {
    const list = normalizeBeneficiaries(b.proposedValue);
    if (!list) return bad("Enter at least one beneficiary with a name.");

    await ensureMemberAccessTables();
    const current = await prisma.member.findUnique({ where: { id: member.id }, select: { beneficiaries: true } });
    const currentValue = current?.beneficiaries ?? "";
    const proposedValue = JSON.stringify(list);

    const pending = await prisma.memberChangeRequest.findFirst({
      where: { memberId: member.id, field: "beneficiaries", status: "PENDING" },
      select: { id: true },
    });
    if (pending) return bad("You already have a beneficiary change waiting for the Trust to review.");

    const reason = String(b.reason ?? "").trim().slice(0, 500) || null;
    const request = await prisma.memberChangeRequest.create({
      data: { memberId: member.id, field: "beneficiaries", currentValue, proposedValue, reason },
      select: { id: true, field: true, currentValue: true, proposedValue: true, reason: true, status: true, createdAt: true },
    });
    await prisma.notification.create({
      data: { text: `${member.fullName} requested a beneficiary change in the member portal`, type: "MEMBER_CHANGE" },
    });
    await audit(null, "MEMBER_CHANGE_REQUESTED", "Member", member.id, { field: "beneficiaries" });
    return created(request);
  }

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
