import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { loadPortalMember } from "@/lib/portal-data";
import DashboardView from "@/components/portal/DashboardView";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function PortalDashboard() {
  const member = await loadPortalMember();
  if (!member) redirect("/portal");

  const announcements = await prisma.announcement.findMany({
    where: { audience: "PUBLIC" },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  return (
    <DashboardView
      member={member}
      announcements={announcements}
      photoSrc={member.photoUrl ? "/api/portal/photo" : null}
    />
  );
}
