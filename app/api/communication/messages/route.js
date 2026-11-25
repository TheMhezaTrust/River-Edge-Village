import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/auth";
import { ok, bad, created } from "@/lib/api";

export async function GET(req) {
  const { user, error } = await guard("communication:view");
  if (error) return error;
  const box = req.nextUrl.searchParams.get("box") || "inbox";
  const where = box === "sent" ? { fromId: user.id, isDraft: false } : box === "drafts" ? { fromId: user.id, isDraft: true } : { toId: user.id };
  const messages = await prisma.message.findMany({
    where,
    include: { from: { select: { name: true } }, to: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return ok(messages);
}

// Composing a message writes a record another member of staff will read, so it
// needs the write permission the Compose button is already gated on in the UI.
// Guarding it on communication:view let a read-only role post one by calling the
// endpoint directly. Marking a message read below stays on :view — that is the
// reader's own inbox state, not a Trust record.
export async function POST(req) {
  const { user, error } = await guard("communication:manage");
  if (error) return error;
  const b = await req.json();
  if (!b.toId || !b.subject) return bad("Recipient and subject are required");
  const message = await prisma.message.create({
    data: {
      subject: b.subject,
      body: b.body || "",
      fromId: user.id,
      toId: Number(b.toId),
      isDraft: !!b.isDraft,
    },
  });
  return created(message);
}

export async function PUT(req) {
  const { user, error } = await guard("communication:view");
  if (error) return error;
  const b = await req.json();
  if (!b.id) return bad("id is required");
  const message = await prisma.message.update({
    where: { id: Number(b.id) },
    data: { isRead: b.isRead ?? true },
  });
  return ok(message);
}
