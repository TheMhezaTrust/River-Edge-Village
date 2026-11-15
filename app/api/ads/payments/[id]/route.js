import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, bad } from "@/lib/api";
import { ensureAdManagerTables } from "@/lib/provision";

// Removes a payment captured in error. There is no edit: a correction is a
// deletion plus a new entry, so the revenue figures always match rows somebody
// deliberately recorded.
export async function DELETE(req, { params }) {
  const { user, error } = await guard("ads:manage");
  if (error) return error;
  const { id } = await params;
  try {
    await ensureAdManagerTables();
    const row = await prisma.adPayment.findUnique({
      where: { id: Number(id) },
      include: { advertisement: { select: { companyName: true } } },
    });
    if (!row) return bad("Payment not found", 404);
    await prisma.adPayment.delete({ where: { id: Number(id) } });
    await audit(user, "AD_PAYMENT_DELETED", "AdPayment", id, `${row.advertisement?.companyName}: ${row.amount}`, { amount: row.amount, date: row.date });
    return ok({ ok: true });
  } catch (e) {
    return bad(e.code === "P2025" ? "Payment not found" : e.message);
  }
}
