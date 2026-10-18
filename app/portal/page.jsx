import { redirect } from "next/navigation";
import { getActivePortalSession } from "@/lib/auth";
import PortalLogin from "@/components/portal/PortalLogin";
import PortalAuthPage from "@/components/portal/PortalAuthPage";
import { Alert } from "@/components/ui";

export const dynamic = "force-dynamic";

const REASONS = {
  timeout: "You were signed out after 15 minutes of inactivity. Please sign in again.",
  expired: "Your session has expired. Please sign in again.",
};

export default async function PortalPage({ searchParams }) {
  const session = await getActivePortalSession();
  if (session) redirect("/portal/dashboard");
  const { reason } = await searchParams;

  return (
    <PortalAuthPage>
      <div className="w-full max-w-md">
        {REASONS[reason] && <div className="mb-4"><Alert type="info">{REASONS[reason]}</Alert></div>}
        <PortalLogin />
      </div>
    </PortalAuthPage>
  );
}
