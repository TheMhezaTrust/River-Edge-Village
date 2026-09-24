import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, bad } from "@/lib/api";

// Bulk update: { ids: [...], status?, price? }
export async function PUT(req) {
  const { user, error } = await guard("plots:manage");
  if (error) return error;
  const b = await req.json();
  if (!Array.isArray(b.ids) || b.ids.length === 0) return bad("ids array is required");
  const data = {};
  if (b.status) data.status = b.status;
  if (b.price != null) data.price = Number(b.price);
  if (data.status === "AVAILABLE") data.memberId = null;
  const result = await prisma.plot.updateMany({ where: { id: { in: b.ids.map(Number) } }, data });
  await audit(user, "PLOTS_BULK_UPDATED", "Plot", null, { count: result.count, data });
  return ok({ updated: result.count });
}
