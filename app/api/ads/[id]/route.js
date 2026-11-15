import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, bad } from "@/lib/api";
import { ensureAdManagerTables } from "@/lib/provision";
import { normalizeAd } from "@/lib/ads";

export async function PUT(req, { params }) {
  const { user, error } = await guard("ads:manage");
  if (error) return error;
  const { id } = await params;
  try {
    const b = await req.json();
    const ad = normalizeAd(b);
    if (!ad.companyName) return bad("Company name is required.");
    if (ad.error) return bad(ad.error);

    await ensureAdManagerTables();
    const row = await prisma.advertisement.update({
      where: { id: Number(id) },
      data: {
        companyName: ad.companyName,
        contactName: ad.contactName,
        contactPhone: ad.contactPhone,
        contactEmail: ad.contactEmail,
        imageUrl: ad.imageUrl,
        destinationUrl: ad.destinationUrl,
        displayDurationMs: ad.displayDurationMs,
        isActive: ad.isActive,
        sortOrder: ad.sortOrder,
        notes: ad.notes,
      },
    });
    await audit(user, "AD_UPDATED", "Advertisement", row.id, row.companyName);
    return ok(row);
  } catch (e) {
    return bad(e.code === "P2025" ? "Advertisement not found" : e.message);
  }
}

export async function DELETE(req, { params }) {
  const { user, error } = await guard("ads:manage");
  if (error) return error;
  const { id } = await params;
  try {
    await ensureAdManagerTables();
    const row = await prisma.advertisement.findUnique({ where: { id: Number(id) } });
    if (!row) return bad("Advertisement not found", 404);
    await prisma.advertisement.delete({ where: { id: Number(id) } });
    // Best-effort Blob cleanup — a stored creative is worthless once its advertiser
    // row is gone, but deleting the record must never fail on a storage error.
    if (row.imageUrl) {
      try {
        await del(row.imageUrl);
      } catch {
        // ignore
      }
    }
    await audit(user, "AD_DELETED", "Advertisement", id, row.companyName);
    return ok({ ok: true });
  } catch (e) {
    return bad(e.code === "P2025" ? "Advertisement not found" : e.message);
  }
}
