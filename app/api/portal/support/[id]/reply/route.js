import { prisma } from "@/lib/prisma";
import { getActivePortalMember, unauthorized, audit } from "@/lib/auth";
import { ok, bad } from "@/lib/api";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { ensureSupportDeskTables } from "@/lib/provision";
import { normalizeMessage, MEMBER_TICKET_SELECT } from "@/lib/support";

// A member writing again inside a thread they opened. The ticket goes back to OPEN,
// because a follow-up means the Trust owes another answer.
export async function POST(req, { params }) {
  const member = await getActivePortalMember();
  if (!member) return unauthorized();
  const { id } = await params;

  const limit = rateLimit(`portal-support-reply:${clientIp(req)}:${member.id}`, { limit: 20, windowMs: 60 * 60_000 });
  if (!limit.allowed) return bad(`Too many messages. Please try again in ${limit.retryAfterSeconds} seconds.`, 429);

  const b = await req.json();
  const message = normalizeMessage(b.body);
  if (message.error) return bad(message.error);

  await ensureSupportDeskTables();
  const ticket = await prisma.supportTicket.findFirst({
    where: { id: Number(id), memberId: member.id },
    select: { id: true, department: true, assignees: { select: { userId: true } } },
  });
  if (!ticket) return bad("Ticket not found", 404);

  const updated = await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: {
      status: "OPEN",
      messages: { create: { body: message.body, senderType: "MEMBER" } },
    },
    select: MEMBER_TICKET_SELECT,
  });

  const userIds = ticket.assignees.map((a) => a.userId);
  if (userIds.length) {
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        text: `${member.fullName} replied in a support ticket · ${ticket.department}`,
        type: "SUPPORT",
      })),
    });
  } else {
    await prisma.notification.create({
      data: {
        text: `${member.fullName} replied in an unassigned support ticket · ${ticket.department}`,
        type: "SUPPORT",
      },
    });
  }

  await audit(null, "SUPPORT_MESSAGE_ADDED", "SupportTicket", ticket.id, "Member follow-up");
  return ok(updated);
}
