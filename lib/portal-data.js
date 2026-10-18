import { prisma } from "./prisma.js";
import { getActivePortalMember } from "./auth.js";
import { ensureMemberAccessTables, ensurePlotCertificateColumn } from "./provision.js";

// Every portal page loads its data through here. The member id always comes from
// the verified session and never from a URL parameter, so no query in the portal
// can be pointed at somebody else's record.
export async function loadPortalMember() {
  const session = await getActivePortalMember();
  if (!session) return null;
  // Awaited rather than left to the eager kick-off in lib/prisma.js: this query
  // selects both the portal columns on Member and the certificate column on Plot.
  await Promise.all([ensureMemberAccessTables(), ensurePlotCertificateColumn()]);
  const member = await prisma.member.findUnique({
    where: { id: session.id },
    include: {
      // Payments are filtered to this member as well as the plot: a plot that was
      // once held by somebody else must never show their payments here.
      plots: {
        include: { project: true, payments: { where: { memberId: session.id }, orderBy: { date: "desc" } } },
        orderBy: { number: "asc" },
      },
      payments: { orderBy: { date: "desc" } },
    },
  });
  if (!member || !member.isActive) return null;
  return member;
}

// Beneficiaries live in a JSON string column and the register was imported from
// paper records, so the shape varies: an array, a single object, or nothing.
// `share` is freeform text ("50%", "the house"), not a number.
export function parseBeneficiaries(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((b) => b && b.name);
    if (parsed && parsed.name) return [parsed];
  } catch {}
  return [];
}
