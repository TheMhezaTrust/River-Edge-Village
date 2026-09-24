import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/auth";
import { ok } from "@/lib/api";

export async function GET(req) {
  const { error } = await guard("audit:view");
  if (error) return error;
  const sp = req.nextUrl.searchParams;
  const where = {};
  if (sp.get("userId")) where.userId = Number(sp.get("userId"));
  if (sp.get("action")) where.action = { contains: sp.get("action") };
  const logs = await prisma.auditLog.findMany({
    where,
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return ok(logs);
}
