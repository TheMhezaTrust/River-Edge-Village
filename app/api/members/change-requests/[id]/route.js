import { prisma } from "@/lib/prisma";
import { guard, audit, verifyConfirmToken } from "@/lib/auth";
import { ok, bad } from "@/lib/api";
import { ensureMemberAccessTables, ensureMemberRecordColumns } from "@/lib/provision";

const CHANGEABLE_FIELDS = ["fullName", "idNumber"];

// Approving writes straight onto the member record, so it is one of the sensitive
// staff actions that needs the operator to re-enter their password.
export async function PUT(req, { params }) {
  const { user, error } = await guard("members:manage");
  if (error) return error;

  const { id } = await params;
  const b = await req.json();

  if (!(await verifyConfirmToken(b.confirmToken))) {
    return bad("Password confirmation required or expired. Please try again.", 401);
  }

  const decision = b.decision === "REJECT" ? "REJECTED" : b.decision === "APPROVE" ? "APPROVED" : null;
  if (!decision) return bad("Choose APPROVE or REJECT.");

  // Approving writes onto the member record, which the client selects in full.
  await Promise.all([ensureMemberAccessTables(), ensureMemberRecordColumns()]);
  const request = await prisma.memberChangeRequest.findUnique({ where: { id: Number(id) } });
  if (!request) return bad("Request not found", 404);
  if (request.status !== "PENDING") return bad(`This request was already ${request.status.toLowerCase()}.`);
  // The request's field name is written into the member update, so it has to be
  // checked against the list rather than trusted from the row.
  if (!CHANGEABLE_FIELDS.includes(request.field)) {
    return bad("This request refers to a field that cannot be changed.");
  }

  if (decision === "APPROVED") {
    await prisma.member.update({
      where: { id: request.memberId },
      data: { [request.field]: request.proposedValue },
    });
  }

  const updated = await prisma.memberChangeRequest.update({
    where: { id: request.id },
    data: { status: decision, decidedById: user.id, decidedAt: new Date() },
    include: { member: { select: { fullName: true } } },
  });

  await audit(user, `MEMBER_CHANGE_${decision}`, "Member", request.memberId, {
    field: request.field,
    from: request.currentValue,
    to: decision === "APPROVED" ? request.proposedValue : undefined,
  });

  return ok(updated);
}
