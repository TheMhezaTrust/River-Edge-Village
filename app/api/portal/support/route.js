import { prisma } from "@/lib/prisma";
import { getActivePortalMember, unauthorized, audit } from "@/lib/auth";
import { ok, bad, created } from "@/lib/api";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { ensureSupportDeskTables } from "@/lib/provision";
import { REASONS, isReason, normalizeMessage, MEMBER_TICKET_SELECT } from "@/lib/support";

export async function GET() {
  const member = await getActivePortalMember();
  if (!member) return unauthorized();

  await ensureSupportDeskTables();
  const tickets = await prisma.supportTicket.findMany({
    where: { memberId: member.id },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      reason: true,
      department: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
      // Only the newest message, so the list can show a preview without carrying
      // every thread the member has ever opened.
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, senderType: true, createdAt: true } },
    },
  });

  return ok(
    tickets.map(({ messages, _count, ...ticket }) => ({
      ...ticket,
      messageCount: _count.messages,
      lastMessage: messages[0] || null,
    }))
  );
}

export async function POST(req) {
  const member = await getActivePortalMember();
  if (!member) return unauthorized();

  const limit = rateLimit(`portal-support:${clientIp(req)}:${member.id}`, { limit: 10, windowMs: 60 * 60_000 });
  if (!limit.allowed) return bad(`Too many messages. Please try again in ${limit.retryAfterSeconds} seconds.`, 429);

  const b = await req.json();
  const reason = typeof b.reason === "string" ? b.reason : "";
  if (!isReason(reason)) return bad("Choose a reason for contacting the Trust.");
  const message = normalizeMessage(b.body);
  if (message.error) return bad(message.error);

  await ensureSupportDeskTables();

  const spec = REASONS[reason];
  // Routing is matched on the sign-in address, the one staff field the Trust controls
  // and cannot duplicate. An account that has been renamed or deactivated simply drops
  // out of the list rather than sending the ticket to the wrong person.
  const staff = await prisma.user.findMany({
    where: { email: { in: spec.assignees }, isActive: true },
    select: { id: true, name: true },
  });

  const ticket = await prisma.supportTicket.create({
    data: {
      memberId: member.id,
      reason,
      department: spec.department,
      messages: { create: { body: message.body, senderType: "MEMBER" } },
      assignees: { create: staff.map((u) => ({ userId: u.id })) },
    },
    select: MEMBER_TICKET_SELECT,
  });

  // One bell notification per person the ticket was routed to. Should the routing map
  // name nobody who still holds an active account, a single unowned notification goes
  // to every member of staff instead, so a message is never left where no one sees it.
  if (staff.length) {
    await prisma.notification.createMany({
      data: staff.map((u) => ({
        userId: u.id,
        text: `New support ticket from ${member.fullName} · ${spec.label}`,
        type: "SUPPORT",
      })),
    });
  } else {
    await prisma.notification.create({
      data: {
        text: `New support ticket from ${member.fullName} · ${spec.label} — nobody is assigned, please pick it up`,
        type: "SUPPORT",
      },
    });
  }

  await audit(null, "SUPPORT_TICKET_OPENED", "SupportTicket", ticket.id, spec.label);
  return created(ticket);
}
