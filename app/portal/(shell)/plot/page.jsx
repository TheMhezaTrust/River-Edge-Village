import { redirect } from "next/navigation";
import { loadPortalMember } from "@/lib/portal-data";
import PlotView from "@/components/portal/PlotView";

export const dynamic = "force-dynamic";

export const metadata = { title: "My Plot Details · Member Portal" };

export default async function PortalPlotPage() {
  const member = await loadPortalMember();
  if (!member) redirect("/portal");
  return <PlotView member={member} />;
}
