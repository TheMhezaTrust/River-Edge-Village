import { redirect } from "next/navigation";
import { getActivePortalMember } from "@/lib/auth";
import { REASON_OPTIONS } from "@/lib/support";
import SupportDesk from "@/components/portal/SupportDesk";

export const dynamic = "force-dynamic";

export const metadata = { title: "Contact the Trust · Member Portal" };

export default async function PortalSupportPage() {
  const member = await getActivePortalMember();
  if (!member) redirect("/portal");
  // The reasons are passed down rather than imported by the component: the routing
  // map they come from also carries the staff sign-in addresses each reason is sent
  // to, and those must never reach a browser bundle.
  return <SupportDesk reasons={REASON_OPTIONS} />;
}
