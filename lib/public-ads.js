import { prisma } from "./prisma.js";
import { ensureAdManagerTables } from "./provision.js";

// The whole of the public contract: an unauthenticated page renders this, so the
// advertiser's contact details, notes and payment history are never selected.
const PUBLIC_AD_FIELDS = {
  id: true,
  companyName: true,
  imageUrl: true,
  destinationUrl: true,
  displayDurationMs: true,
};

// Never throws. The billboard is decoration on the public site — a missing table
// or a database blip must not take the homepage down with it.
export async function getActiveAds() {
  try {
    // The tables are created the first time the Ad Manager is opened, which a
    // visitor to the public site can easily beat.
    await ensureAdManagerTables();
    return await prisma.advertisement.findMany({
      where: { isActive: true },
      select: PUBLIC_AD_FIELDS,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 12,
    });
  } catch {
    return [];
  }
}
