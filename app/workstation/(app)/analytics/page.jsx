import { notFound } from "next/navigation";
import { getStaffSession, SUPER_ADMIN } from "@/lib/auth";
import { ensureSuperAdmin } from "@/lib/super-admin";
import { prisma } from "@/lib/prisma";
import { getAnalytics } from "@/lib/analytics";
import AnalyticsDashboard from "@/components/ws/AnalyticsDashboard";

export const metadata = { title: "Traffic Analytics", robots: { index: false } };
export const dynamic = "force-dynamic";

// Main Administrator only. Everyone else — including other administrators —
// gets a 404, matching how the administrator-only /plots routes behave.
export default async function AnalyticsPage() {
  const session = await getStaffSession();
  if (!session) notFound();
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, name: true, isActive: true, role: true },
  });
  const role = user?.isActive ? await ensureSuperAdmin(user) : null;
  if (role !== SUPER_ADMIN) notFound();

  // This page is Main-Administrator-only and noindexed, so a database problem is
  // reported here rather than crashing the route.
  let data = null;
  let error = null;
  try {
    data = await getAnalytics(30);
  } catch (e) {
    error = e?.message || "Could not load analytics";
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Traffic Analytics</h1>
        <div className="card p-6 text-sm text-red-700">
          <p className="font-semibold mb-1">Analytics could not be loaded.</p>
          <p className="text-xs text-gray-600 break-words">{error}</p>
        </div>
      </div>
    );
  }

  return <AnalyticsDashboard data={data} />;
}
