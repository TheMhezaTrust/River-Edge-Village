import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, bad, created } from "@/lib/api";
import { memberPrice } from "@/lib/member-totals";

function normalizeBeneficiaries(input) {
  if (Array.isArray(input)) return input;
  try {
    const parsed = JSON.parse(input);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  const [name, relation] = String(input).split(",").map((s) => s.trim());
  return name ? [{ name, relation: relation || "", share: "100%" }] : [];
}

function withBalance(m) {
  const totalPaid = m.payments.reduce((s, p) => s + p.amount, 0);
  const price = memberPrice(m);
  const outstanding = Math.max(0, price - totalPaid);
  return {
    ...m,
    price,
    totalPaid,
    outstandingBalance: outstanding,
    paymentStatus: price === 0 ? "NONE" : outstanding === 0 ? "PAID" : totalPaid > 0 ? "PARTIAL" : "OUTSTANDING",
  };
}

export async function GET(req) {
  const { user, error } = await guard("members:view");
  if (error) return error;
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim();
  const where = q
    ? { OR: [{ fullName: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }, { idNumber: { contains: q } }] }
    : {};
  const members = await prisma.member.findMany({
    where,
    include: { plots: true, payments: true },
    orderBy: { fullName: "asc" },
  });
  return ok(members.map(withBalance));
}

export async function POST(req) {
  const { user, error } = await guard("members:manage");
  if (error) return error;
  try {
    const b = await req.json();
    if (!b.fullName || !b.email || !b.phone) return bad("Full name, email and phone are required");
    const member = await prisma.member.create({
      data: {
        fullName: b.fullName,
        idNumber: b.idNumber || null,
        dateOfBirth: b.dateOfBirth || null,
        gender: b.gender || null,
        maritalStatus: b.maritalStatus || null,
        physicalAddress: b.physicalAddress || null,
        postalAddress: b.postalAddress || null,
        phone: b.phone,
        email: b.email.toLowerCase().trim(),
        purchasePrice: b.purchasePrice != null ? Number(b.purchasePrice) : null,
        paymentPlan: b.paymentPlan || null,
        beneficiaries: b.beneficiaries ? JSON.stringify(normalizeBeneficiaries(b.beneficiaries)) : null,
        notes: b.notes || null,
      },
    });
    if (b.plotId) {
      await prisma.plot.update({ where: { id: Number(b.plotId) }, data: { memberId: member.id, status: "SOLD" } });
    }
    await audit(user, "MEMBER_CREATED", "Member", member.id, member.fullName);
    return created(member);
  } catch (e) {
    return bad(e.code === "P2002" ? "A member with this email already exists" : e.message);
  }
}
