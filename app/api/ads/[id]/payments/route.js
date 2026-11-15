import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, bad, created } from "@/lib/api";
import { ensureAdManagerTables } from "@/lib/provision";
import { normalizeAdPayment } from "@/lib/ads";

// Records what an advertiser paid (or was invoiced) for a specific advertisement.
// This is the Ad Manager's own revenue tracker; it deliberately does not post into
// the Trust's Income rows or the double-entry ledger.
export async function POST(req, { params }) {
  const { user, error } = await guard("ads:manage");
  if (error) return error;
  const { id } = await params;
  try {
    const b = await req.json();
    const payment = normalizeAdPayment(b);
    if (payment.error) return bad(payment.error);

    await ensureAdManagerTables();
    const ad = await prisma.advertisement.findUnique({ where: { id: Number(id) }, select: { id: true, companyName: true } });
    if (!ad) return bad("Advertisement not found", 404);

    const row = await prisma.adPayment.create({
      data: {
        advertisementId: ad.id,
        amount: payment.amount,
        date: payment.date,
        method: payment.method,
        status: payment.status,
        reference: payment.reference,
        note: payment.note,
        createdById: user.id,
      },
    });
    await audit(user, "AD_PAYMENT_RECORDED", "AdPayment", row.id, `${ad.companyName}: ${row.amount} ${row.status}`);
    return created(row);
  } catch (e) {
    return bad(e.message);
  }
}
