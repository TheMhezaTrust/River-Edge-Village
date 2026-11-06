import { loadPreviewMember } from "@/lib/preview";
import PreviewShell from "@/components/portal/PreviewShell";
import PlotView from "@/components/portal/PlotView";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Plot (Preview)", robots: { index: false } };

export default async function PlotPreviewPage({ params }) {
  const { id } = await params;
  const member = await loadPreviewMember(id);
  const linkBase = `/workstation/preview/${member.id}`;
  return (
    <PreviewShell member={member} active="plot">
      <PlotView member={member} linkBase={linkBase} />
    </PreviewShell>
  );
}
