import bcrypt from "bcryptjs";
import { prisma } from "./prisma.js";
import { VIEW963_OWNER } from "./roles.js";

// The software owner's account is designated here rather than through the UI, for
// the same reason as the Main Administrator (lib/super-admin.js): a role that sits
// above every administrator cannot be something an administrator can grant, take
// away or hand to themselves. Unlike the Main Administrator the account is created
// here too, because the production database cannot be reached from a development
// machine — set VIEW963_OWNER_EMAIL and VIEW963_OWNER_PASSWORD on Vercel and the
// account provisions itself the next time the workstation is opened or signed in to.
//
// Both values are read from the environment only. No owner email or password may
// ever be written into this repository.
export const VIEW963_OWNER_EMAIL = String(process.env.VIEW963_OWNER_EMAIL || "").toLowerCase().trim();
export const VIEW963_OWNER_NAME = String(process.env.VIEW963_OWNER_NAME || "View963 Tech").trim() || "View963 Tech";

export function isView963Owner(user) {
  return !!user && user.role === VIEW963_OWNER;
}

let provisioning = null;

// Idempotent, memoised per server instance, and never throws: a failure to create
// the owner account must not take the workstation down for everybody else.
export function provisionView963Owner() {
  if (!VIEW963_OWNER_EMAIL) return Promise.resolve(null);
  if (!provisioning) {
    provisioning = (async () => {
      const existing = await prisma.user.findUnique({
        where: { email: VIEW963_OWNER_EMAIL },
        select: { id: true, role: true },
      });
      if (existing) return existing.role === VIEW963_OWNER ? existing.id : promote(existing.id);

      const password = String(process.env.VIEW963_OWNER_PASSWORD || "");
      // Without a password there is nothing safe to create: an account with an
      // empty hash could never sign in, and inventing one would put a working
      // owner login in the world that nobody knows about.
      if (password.length < 8) return null;

      const created = await prisma.user.create({
        data: {
          name: VIEW963_OWNER_NAME,
          email: VIEW963_OWNER_EMAIL,
          role: VIEW963_OWNER,
          title: "Software Owner",
          password: await bcrypt.hash(password, 10),
        },
        select: { id: true },
      });
      await record(created.id, `Software owner account created (${VIEW963_OWNER_EMAIL})`);
      return created.id;
    })().catch((e) => {
      provisioning = null;
      throw e;
    });
    // The memo must not hold a rejection, but callers must not see one either.
    provisioning.catch(() => {});
  }
  return provisioning.catch(() => null);
}

async function promote(id) {
  await prisma.user.update({ where: { id }, data: { role: VIEW963_OWNER } });
  await record(id, `Designated software owner (${VIEW963_OWNER_EMAIL})`);
  return id;
}

async function record(userId, details) {
  try {
    const { ensureAuditTrailColumns } = await import("./provision.js");
    await ensureAuditTrailColumns();
    await prisma.auditLog.create({
      data: { userId, action: "ROLE_DESIGNATED", entity: "USER", entityId: String(userId), details },
    });
  } catch {
    // the designation itself succeeded; a missing audit table must not undo it
  }
}

// Returns the role the caller should treat as current. The designation is applied
// to an already-signed-in session too, so it takes effect without signing out.
export async function ensureView963Owner(user) {
  if (!user) return null;
  if (user.role === VIEW963_OWNER) return VIEW963_OWNER;
  if (!VIEW963_OWNER_EMAIL) return user.role;
  if (String(user.email || "").toLowerCase().trim() !== VIEW963_OWNER_EMAIL) return user.role;
  try {
    await promote(user.id);
    return VIEW963_OWNER;
  } catch {
    return user.role;
  }
}
