import { redirect } from "next/navigation";
import { getActivePortalMember } from "@/lib/auth";
import PortalShell from "@/components/portal/PortalShell";

export const dynamic = "force-dynamic";

export default async function PortalAppLayout({ children }) {
  const member = await getActivePortalMember();
  if (!member) redirect("/portal");
  if (member.mustChangePassword) redirect("/portal/password");
  return <PortalShell member={{ name: member.fullName, email: member.email }}>{children}</PortalShell>;
}
