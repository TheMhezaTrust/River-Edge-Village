import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, bad, created } from "@/lib/api";

// Convert an inquiry into a member
export async function POST(req, { params }) {
  const { user, error } = await guard("members:manage");
  if (error) return error;
  const { id } = await params;
  try {
    const b = await req.json().catch(() => ({}));
    const inquiry = await prisma.inquiry.findUnique({ where: { id: Number(id) }, include: { plot: true } });
    if (!inquiry) return bad("Inquiry not found", 404);

    const existing = await prisma.member.findUnique({ where: { email: inquiry.email.toLowerCase() } });
    if (existing) return bad("A member with this email already exists");

    const member = await prisma.member.create({
      data: {
        fullName: b.fullName || inquiry.name,
        idNumber: b.idNumber || inquiry.idNumber || null,
        phone: b.phone || inquiry.phone,
        email: inquiry.email.toLowerCase(),
        purchasePrice: b.purchasePrice != null ? Number(b.purchasePrice) : inquiry.plot?.price ?? null,
        paymentPlan: b.paymentPlan || null,
        notes: `Converted from inquiry #${inquiry.id}${inquiry.message ? `: ${inquiry.message}` : ""}`,
      },
    });
    if (inquiry.plotId) {
      await prisma.plot.update({ where: { id: inquiry.plotId }, data: { memberId: member.id, status: b.status || "RESERVED" } });
    }
    await prisma.inquiry.update({ where: { id: inquiry.id }, data: { status: "CONVERTED" } });
    await audit(user, "INQUIRY_CONVERTED", "Inquiry", inquiry.id, { memberId: member.id });
    return created(member);
  } catch (e) {
    return bad(e.message);
  }
}
