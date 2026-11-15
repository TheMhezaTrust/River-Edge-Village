import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, bad, created } from "@/lib/api";
import { ensureAdManagerTables } from "@/lib/provision";
import { normalizeAd, adRevenue } from "@/lib/ads";

// The Ad Manager belongs to the software owner (VIEW963_OWNER). ads:view is held by
// that role alone, so no other staff account can read the advertisers or what they
// pay; ads:manage is what authorises every write below.
export async function GET() {
  const { error } = await guard("ads:view");
  if (error) return error;
  try {
    await ensureAdManagerTables();
    const ads = await prisma.advertisement.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: { payments: { orderBy: { date: "desc" } } },
    });
    return ok({ ads, revenue: adRevenue(ads) });
  } catch (e) {
    return bad(e.message);
  }
}

export async function POST(req) {
  const { user, error } = await guard("ads:manage");
  if (error) return error;
  try {
    const b = await req.json();
    const ad = normalizeAd(b);
    if (!ad.companyName) return bad("Company name is required.");
    if (ad.error) return bad(ad.error);

    await ensureAdManagerTables();
    const row = await prisma.advertisement.create({
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
        createdById: user.id,
      },
    });
    await audit(user, "AD_CREATED", "Advertisement", row.id, row.companyName);
    return created(row);
  } catch (e) {
    return bad(e.message);
  }
}
