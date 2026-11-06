import { prisma } from "@/lib/prisma";
import { loadPreviewMember } from "@/lib/preview";
import PreviewShell from "@/components/portal/PreviewShell";
import DashboardView from "@/components/portal/DashboardView";

export const metadata = { title: "View as Member", robots: { index: false } };
export const dynamic = "force-dynamic";

// An administrator preview of a single member's portal dashboard. It lives outside
// the (app) group on purpose: that group wraps its pages in the workstation shell
// (the admin sidebar), and the whole point of "View as Member" is to see the member's
// screen with the admin chrome hidden. Access is checked in loadPreviewMember() against
// the staff session, and the member id comes from the URL only because a staff user —
// never a member — is the one authenticated here.
export default async function ViewAsMemberPage({ params }) {
  const { id } = await params;
  const member = await loadPreviewMember(id);

  const announcements = await prisma.announcement.findMany({
    where: { audience: "PUBLIC" },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  return (
    <PreviewShell member={member} active="dashboard">
      <DashboardView member={member} announcements={announcements} linkBase={`/workstation/preview/${member.id}`} />
    </PreviewShell>
  );
}
