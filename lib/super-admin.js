import { prisma } from "./prisma.js";
import { SUPER_ADMIN } from "./roles.js";

// The Main Administrator is designated here (override with SUPER_ADMIN_EMAIL on
// Vercel) instead of through the UI, so no administrator can promote themselves
// or anyone else into the role. Promotion is idempotent and applies itself the
// first time the designated account signs in or opens the workstation, which
// needs no manual database access.
export const SUPER_ADMIN_EMAIL = String(
  process.env.SUPER_ADMIN_EMAIL || "bongani.sifiniza@themhezatrust.local"
).toLowerCase().trim();

export function isSuperAdmin(user) {
  return !!user && user.role === SUPER_ADMIN;
}

// Returns the role the caller should treat as current. Never throws: a failed
// promotion must not lock the designated administrator out of the workstation.
export async function ensureSuperAdmin(user) {
  if (!user) return null;
  if (user.role === SUPER_ADMIN) return SUPER_ADMIN;
  if (String(user.email || "").toLowerCase().trim() !== SUPER_ADMIN_EMAIL) return user.role;
  try {
    await prisma.user.update({ where: { id: user.id }, data: { role: SUPER_ADMIN } });
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "ROLE_DESIGNATED",
        entity: "USER",
        entityId: String(user.id),
        details: `Designated Main Administrator (${SUPER_ADMIN_EMAIL})`,
      },
    });
    return SUPER_ADMIN;
  } catch {
    return user.role;
  }
}
