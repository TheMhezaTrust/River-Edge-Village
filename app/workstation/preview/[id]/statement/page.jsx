import { loadPreviewMember } from "@/lib/preview";
import PreviewShell from "@/components/portal/PreviewShell";
import StatementView from "@/components/portal/StatementView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Statement (Preview)", robots: { index: false } };

export default async function StatementPreviewPage({ params }) {
  const { id } = await params;
  const member = await loadPreviewMember(id);
  const linkBase = `/workstation/preview/${member.id}`;
  return (
    <PreviewShell member={member} active="statement">
      <StatementView member={member} linkBase={linkBase} />
    </PreviewShell>
  );
}
