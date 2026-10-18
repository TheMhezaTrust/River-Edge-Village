import { prisma } from "@/lib/prisma";
import { getPortalSession, startPortalSession, unauthorized } from "@/lib/auth";
import { ok } from "@/lib/api";
import { ensureMemberAccessTables } from "@/lib/provision";

// Re-issues the member's 15-minute token while they are active. Without this the
// session would be a hard 15-minute limit; with it, expiry means "no activity for
// 15 minutes", which is what the Trust asked for. The portal shell only calls it
// when the tab is visible and the member has actually done something.
export async function POST() {
  const session = await getPortalSession();
  if (!session) return unauthorized();
  await ensureMemberAccessTables();
  const member = await prisma.member.findUnique({
    where: { id: session.id },
    select: { id: true, fullName: true, email: true, isActive: true, mustChangePassword: true },
  });
  if (!member || !member.isActive) return unauthorized();
  await startPortalSession(member);
  return ok({ mustChangePassword: member.mustChangePassword });
}
