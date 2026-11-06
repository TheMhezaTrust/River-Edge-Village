import { redirect } from "next/navigation";
import { loadPortalMember } from "@/lib/portal-data";
import BeneficiariesView from "@/components/portal/BeneficiariesView";

export const dynamic = "force-dynamic";

export const metadata = { title: "My Beneficiaries · Member Portal" };

export default async function PortalBeneficiariesPage() {
  const member = await loadPortalMember();
  if (!member) redirect("/portal");
  return <BeneficiariesView member={member} />;
}
