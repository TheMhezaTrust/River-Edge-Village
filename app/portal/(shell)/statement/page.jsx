import { redirect } from "next/navigation";
import { loadPortalMember } from "@/lib/portal-data";
import StatementView from "@/components/portal/StatementView";

export const dynamic = "force-dynamic";

export const metadata = { title: "Statement of Account · Member Portal" };

export default async function PortalStatementPage() {
  const member = await loadPortalMember();
  if (!member) redirect("/portal");
  return <StatementView member={member} />;
}
