import { redirect } from "next/navigation";
import { loadPortalMember } from "@/lib/portal-data";
import PaymentsView from "@/components/portal/PaymentsView";

export const dynamic = "force-dynamic";

export const metadata = { title: "Payments & Statement · Member Portal" };

export default async function PortalPaymentsPage() {
  const member = await loadPortalMember();
  if (!member) redirect("/portal");
  return <PaymentsView member={member} />;
}
