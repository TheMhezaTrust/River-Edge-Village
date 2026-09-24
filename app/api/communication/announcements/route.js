import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, bad, created } from "@/lib/api";

export async function GET() {
  const { error } = await guard("communication:view");
  if (error) return error;
  const announcements = await prisma.announcement.findMany({
    where: { audience: "INTERNAL" },
    orderBy: { createdAt: "desc" },
  });
  return ok(announcements);
}

export async function POST(req) {
  const { user, error } = await guard("announcements:manage");
  if (error) return error;
  const b = await req.json();
  if (!b.title || !b.body) return bad("Title and body are required");
  const ann = await prisma.announcement.create({
    data: { title: b.title, body: b.body, audience: b.audience || "INTERNAL", category: b.category || null, authorId: user.id },
  });
  await audit(user, "ANNOUNCEMENT_CREATED", "Announcement", ann.id, ann.title);
  return created(ann);
}

export async function DELETE(req) {
  const { user, error } = await guard("announcements:manage");
  if (error) return error;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return bad("id is required");
  await prisma.announcement.delete({ where: { id: Number(id) } });
  await audit(user, "ANNOUNCEMENT_DELETED", "Announcement", id);
  return ok({ ok: true });
}
