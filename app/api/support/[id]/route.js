import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/auth";
import { ok, bad } from "@/lib/api";
import { ensureSupportDeskTables } from "@/lib/provision";
import { ticketAccessWhere } from "@/lib/support";

export async function GET(req, { params }) {
  const { user, error } = await guard("support:view");
  if (error) return error;
  const { id } = await params;

  await ensureSupportDeskTables();
  const ticket = await prisma.supportTicket.findFirst({
    where: ticketAccessWhere(user.role, user.id, { id: Number(id) }),
    select: {
      id: true,
      reason: true,
      department: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      member: { select: { id: true, fullName: true } },
      assignees: { select: { user: { select: { id: true, name: true, role: true } } } },
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          body: true,
          senderType: true,
          createdAt: true,
          // Staff see who answered; the member-facing route selects none of this.
          sender: { select: { id: true, name: true } },
        },
      },
    },
  });

  // Missing rather than forbidden for a ticket routed to somebody else, for the same
  // reason as on the member side: a 403 would confirm the ticket exists.
  if (!ticket) return bad("Ticket not found", 404);

  const { assignees, ...rest } = ticket;
  return ok({ ...rest, assignedTo: assignees.map((a) => a.user) });
}
