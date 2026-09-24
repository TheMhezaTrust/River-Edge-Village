import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, bad, created } from "@/lib/api";
import { PLAN_W, PLAN_H, comparePlotNumbers } from "@/lib/plan-layout";

export async function GET(req) {
  const { error } = await guard("plots:view");
  if (error) return error;
  const sp = req.nextUrl.searchParams;
  const where = {};
  if (sp.get("status")) where.status = sp.get("status");
  if (sp.get("block")) where.block = sp.get("block");
  if (sp.get("q")) where.number = { contains: sp.get("q") };
  const plots = await prisma.plot.findMany({
    where,
    include: { member: { select: { id: true, fullName: true, email: true, phone: true } } },
  });
  plots.sort((a, b) => comparePlotNumbers(a.number, b.number));
  return ok(plots);
}

// New erven without survey coordinates are parked in the first free slot on a
// coarse grid so they stay visible on the layout map instead of stacking at 0,0.
function freeSlot(taken) {
  for (let y = 45; y <= PLAN_H - 45; y += 45) {
    for (let x = 45; x <= PLAN_W - 45; x += 45) {
      if (!taken.has(`${x}:${y}`)) return { x, y };
    }
  }
  return { x: PLAN_W / 2, y: PLAN_H / 2 };
}

export async function POST(req) {
  const { user, error } = await guard("plots:manage");
  if (error) return error;
  try {
    const b = await req.json();
    if (!b.number || !b.price) return bad("Plot number and price are required");
    const project = await prisma.project.findFirst({ where: { slug: b.projectSlug || "river-edge" } });
    let position = b.x != null && b.y != null ? { x: Number(b.x), y: Number(b.y) } : null;
    if (!position) {
      const existing = await prisma.plot.findMany({ where: { projectId: project.id }, select: { x: true, y: true } });
      position = freeSlot(new Set(existing.map((p) => `${Math.round(p.x / 45) * 45}:${Math.round(p.y / 45) * 45}`)));
    }
    const plot = await prisma.plot.create({
      data: {
        number: String(b.number),
        sizeSqm: b.sizeSqm ? Number(b.sizeSqm) : 800,
        price: Number(b.price),
        status: b.status || "AVAILABLE",
        description: b.description || null,
        block: b.block || null,
        x: position.x,
        y: position.y,
        projectId: project.id,
      },
    });
    await audit(user, "PLOT_CREATED", "Plot", plot.id, plot.number);
    return created(plot);
  } catch (e) {
    return bad(e.message);
  }
}
