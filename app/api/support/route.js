import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/auth";
import { ok } from "@/lib/api";
import { ensureSupportDeskTables } from "@/lib/provision";
import { ticketAccessWhere } from "@/lib/support";

export async function GET() {
  const { user, error } = await guard("support:view");
  if (error) return error;

  await ensureSupportDeskTables();
  const tickets = await prisma.supportTicket.findMany({
    where: ticketAccessWhere(user.role, user.id),
    orderBy: { updatedAt: "desc" },
    take: 200,
    select: {
      id: true,
      reason: true,
      department: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      // The member's name is all the inbox needs to identify a thread. Contact
      // details and plot records stay in the Members module, where the usual
      // permissions already decide who may read them.
      member: { select: { id: true, fullName: true } },
      assignees: { select: { user: { select: { id: true, name: true, role: true } } } },
      _count: { select: { messages: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, senderType: true, createdAt: true } },
    },
  });

  return ok(
    tickets.map(({ messages, assignees, _count, ...ticket }) => ({
      ...ticket,
      assignedTo: assignees.map((a) => a.user),
      messageCount: _count.messages,
      lastMessage: messages[0] || null,
    }))
  );
}
