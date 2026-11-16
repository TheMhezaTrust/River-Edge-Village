import { prisma } from "@/lib/prisma";
import { getActivePortalMember, unauthorized } from "@/lib/auth";
import { ok, bad } from "@/lib/api";
import { ensureSupportDeskTables } from "@/lib/provision";
import { MEMBER_TICKET_SELECT } from "@/lib/support";

export async function GET(req, { params }) {
  const member = await getActivePortalMember();
  if (!member) return unauthorized();
  const { id } = await params;

  await ensureSupportDeskTables();
  // Filtered on the member as well as the id, so the only ticket this can ever return
  // is the caller's own.
  const ticket = await prisma.supportTicket.findFirst({
    where: { id: Number(id), memberId: member.id },
    select: MEMBER_TICKET_SELECT,
  });
  // Reported as missing rather than forbidden: a 403 would confirm that the ticket
  // belonging to somebody else actually exists.
  if (!ticket) return bad("Ticket not found", 404);
  return ok(ticket);
}
