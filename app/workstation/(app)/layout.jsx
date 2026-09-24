import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth";
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

  return <WorkstationShell user={user}>{children}</WorkstationShell>;
}
