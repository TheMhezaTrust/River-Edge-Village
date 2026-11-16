import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, bad } from "@/lib/api";
import { ensureSupportDeskTables } from "@/lib/provision";
import { normalizeMessage, ticketAccessWhere } from "@/lib/support";

// A member of staff answering a ticket. The same visibility rule that decides what the
// inbox lists also decides what may be answered here, so a ticket routed to the
// finance desk cannot be replied to from the plot desk.
export async function POST(req, { params }) {
  const { user, error } = await guard("support:manage");
  if (error) return error;
  const { id } = await params;

  const b = await req.json();
  const message = normalizeMessage(b.body);
  if (message.error) return bad(message.error);

  await ensureSupportDeskTables();
  const ticket = await prisma.supportTicket.findFirst({
    where: ticketAccessWhere(user.role, user.id, { id: Number(id) }),
    select: { id: true, member: { select: { fullName: true } } },
  });
  if (!ticket) return bad("Ticket not found", 404);

  const updated = await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: {
      status: "ANSWERED",
      messages: { create: { body: message.body, senderType: "STAFF", senderId: user.id } },
    },
    select: {
      id: true,
      status: true,
      updatedAt: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          body: true,
          senderType: true,
          createdAt: true,
          sender: { select: { id: true, name: true } },
        },
      },
    },
  });

  await audit(user, "SUPPORT_REPLY_SENT", "SupportTicket", ticket.id, ticket.member.fullName);
  return ok(updated);
}
