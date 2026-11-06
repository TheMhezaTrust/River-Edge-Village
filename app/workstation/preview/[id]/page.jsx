import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getStaffSession, can } from "@/lib/auth";
import { ensureMemberRecordColumns } from "@/lib/provision";
import DashboardView from "@/components/portal/DashboardView";

export const metadata = { title: "View as Member", robots: { index: false } };
export const dynamic = "force-dynamic";

// An administrator preview of a single member's portal dashboard. It lives outside
// the (app) group on purpose: that group wraps its pages in the workstation shell
// (the admin sidebar), and the whole point of "View as Member" is to see the member's
// screen with the admin chrome hidden. Access is still checked against the staff
// session, and the member id comes from the URL only because a staff user — never a
// member — is the one authenticated here.
export default async function ViewAsMemberPage({ params }) {
  const session = await getStaffSession();
  if (!session) redirect("/workstation/login");
  if (!can(session, "members:view")) redirect("/workstation");

  const { id } = await params;
  const memberId = Number(id);
  if (!Number.isInteger(memberId)) notFound();

  // Awaited before the query: it selects Member.purchaseDate and Plot.purchasedAt.
  await ensureMemberRecordColumns();
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      plots: {
        include: { project: true, payments: { where: { memberId }, orderBy: { date: "desc" } } },
        orderBy: { number: "asc" },
      },
      payments: { orderBy: { date: "desc" } },
    },
  });
  if (!member) notFound();

  const announcements = await prisma.announcement.findMany({
    where: { audience: "PUBLIC" },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="sticky top-0 z-40 border-b border-amber-300 bg-amber-50 px-4 py-2.5 print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1">
          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Preview</span>
          <p className="text-sm font-medium text-amber-900">
            Viewing the member portal as <strong>{member.fullName}</strong>. This is read-only — nothing here is signed in as them.
          </p>
          <Link href={`/workstation/members/${member.id}`} className="btn-outline btn-sm ml-auto">← Exit preview</Link>
        </div>
      </div>
      <main className="mx-auto max-w-6xl p-4 lg:p-6 print:p-0">
        <DashboardView member={member} announcements={announcements} preview />
      </main>
    </div>
  );
}
