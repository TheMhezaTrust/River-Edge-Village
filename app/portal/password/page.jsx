import { redirect } from "next/navigation";
import { getActivePortalMember } from "@/lib/auth";
import PortalAuthPage from "@/components/portal/PortalAuthPage";
import SetPortalPassword from "@/components/portal/SetPortalPassword";

export const dynamic = "force-dynamic";
export const metadata = { title: "Choose a new password" };

// Reached after signing in with a temporary password the office issued. The shell
// layout sends anyone carrying the flag here, so the rest of the portal cannot be
// used until the member has chosen a password of their own.
export default async function PortalPasswordPage() {
  const member = await getActivePortalMember();
  if (!member) redirect("/portal");
  if (!member.mustChangePassword) redirect("/portal/dashboard");

  return (
    <PortalAuthPage>
      <div className="w-full max-w-md">
        <div className="card p-8">
          <h1 className="text-2xl font-bold text-forest-900">Choose your own password</h1>
          <p className="mt-1 mb-6 text-sm text-gray-500">
            The Trust office issued a temporary password for your account. For your security, set your own
            before continuing into the portal.
          </p>
          <SetPortalPassword forced />
        </div>
      </div>
    </PortalAuthPage>
  );
}
