import Link from "next/link";
import { readMemberToken } from "@/lib/member-access";
import PortalAuthPage from "@/components/portal/PortalAuthPage";
import SetPortalPassword from "@/components/portal/SetPortalPassword";

export const dynamic = "force-dynamic";
export const metadata = { title: "Set your portal password" };

export default async function PortalAccessPage({ searchParams }) {
  const { token } = await searchParams;
  const row = token ? await readMemberToken(token) : null;

  return (
    <PortalAuthPage>
      <div className="w-full max-w-md">
        <div className="card p-8">
          {row ? (
            <>
              <h1 className="text-2xl font-bold text-forest-900">
                {row.purpose === "RESET" ? "Reset your password" : "Set your portal password"}
              </h1>
              <p className="mt-1 mb-6 text-sm text-gray-500">
                Hello {row.member.fullName.split(" ")[0]} — choose the password you will use to sign in to
                the member portal. This link can only be used once.
              </p>
              <SetPortalPassword token={String(token)} />
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-forest-900">This link is no longer valid</h1>
              <p className="mt-2 text-sm text-gray-600">
                Portal links expire 30 minutes after they are sent and can only be used once. Sign in and
                choose <strong>Forgot password?</strong> to request a new link, or contact the Trust office
                using the details below.
              </p>
              <Link href="/portal" className="btn-primary mt-6 w-full justify-center">Back to sign in</Link>
            </>
          )}
        </div>
      </div>
    </PortalAuthPage>
  );
}
