import { redirect } from "next/navigation";
import { getStaffSession, VIEW963_OWNER } from "@/lib/auth";
import { ensureSuperAdmin } from "@/lib/super-admin";
import { ensureView963Owner } from "@/lib/owner-account";
import { prisma } from "@/lib/prisma";
import WorkstationShell from "@/components/ws/WorkstationShell";

export const metadata = { robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function WorkstationLayout({ children }) {
  const session = await getStaffSession();
  if (!session) redirect("/workstation/login");
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, name: true, email: true, role: true, title: true, lastLoginAt: true, isActive: true },
  });
  if (!user || !user.isActive) redirect("/workstation/login");
  // An already-signed-in session picks up the Main Administrator designation
  // without needing to sign in again. The software owner outranks it, so that
  // designation is resolved first and wins.
  let role = (await ensureView963Owner(user)) || user.role;
  if (role !== VIEW963_OWNER) role = (await ensureSuperAdmin(user)) || role;

  return <WorkstationShell user={{ ...user, role }}>{children}</WorkstationShell>;
}
