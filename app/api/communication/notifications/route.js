import { prisma } from "@/lib/prisma";
import { getStaffSession, unauthorized } from "@/lib/auth";
import { ok } from "@/lib/api";

export async function GET() {
  const user = await getStaffSession();
  if (!user) return unauthorized();
  const notifications = await prisma.notification.findMany({
    where: { OR: [{ userId: user.id }, { userId: null }] },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return ok(notifications);
}

export async function PUT(req) {
  const user = await getStaffSession();
  if (!user) return unauthorized();
  const b = await req.json();
  if (b.all) {
    await prisma.notification.updateMany({ where: { OR: [{ userId: user.id }, { userId: null }] }, data: { isRead: true } });
  } else if (b.id) {
    await prisma.notification.update({ where: { id: Number(b.id) }, data: { isRead: true } });
  }
  return ok({ ok: true });
}
