import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, created } from "@/lib/api";

export async function GET(req) {
  const { error } = await guard("inquiries:view");
  if (error) return error;
  const sp = req.nextUrl.searchParams;
  const where = {};
  if (sp.get("status")) where.status = sp.get("status");
  if (sp.get("q")) {
    const q = sp.get("q");
    where.OR = [{ name: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }];
  }
  const inquiries = await prisma.inquiry.findMany({
    where,
    include: { plot: { select: { id: true, number: true } }, assignee: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return ok(inquiries);
}

// Manual inquiry creation by staff
export async function POST(req) {
  const { user, error } = await guard("inquiries:manage");
  if (error) return error;
  const b = await req.json();
  const inquiry = await prisma.inquiry.create({
    data: {
      name: b.name,
      email: b.email || "",
      phone: b.phone || "",
      message: b.message || null,
      source: b.source || "PHONE",
      plotId: b.plotId ? Number(b.plotId) : null,
      assignedTo: b.assignedTo ? Number(b.assignedTo) : user.id,
    },
  });
  await audit(user, "INQUIRY_CREATED", "Inquiry", inquiry.id, inquiry.name);
  return created(inquiry);
}
