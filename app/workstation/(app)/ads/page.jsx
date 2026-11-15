import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getStaffSession, VIEW963_OWNER } from "@/lib/auth";
import AdManager from "@/components/ws/AdManager";

export const metadata = { title: "Ad Manager", robots: { index: false } };
export const dynamic = "force-dynamic";

// The Ad Manager is the software owner's module and nobody else's: every other
// staff role — the Main Administrator included — gets a 404 rather than a 403, so
// the sidebar link is the only trace of it and the route reveals nothing. The role
// is read from the database rather than the session, because a session signed
// before the designation was applied still carries the old role.
export default async function AdManagerPage() {
  const session = await getStaffSession();
  if (!session) notFound();
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { role: true, isActive: true },
  });
  if (!user || !user.isActive || user.role !== VIEW963_OWNER) notFound();

  return <AdManager />;
}
