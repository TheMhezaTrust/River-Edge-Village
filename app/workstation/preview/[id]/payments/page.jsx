import { loadPreviewMember } from "@/lib/preview";
import PreviewShell from "@/components/portal/PreviewShell";
import PaymentsView from "@/components/portal/PaymentsView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payments (Preview)", robots: { index: false } };

export default async function PaymentsPreviewPage({ params }) {
  const { id } = await params;
  const member = await loadPreviewMember(id);
  const linkBase = `/workstation/preview/${member.id}`;
  return (
    <PreviewShell member={member} active="payments">
      <PaymentsView member={member} linkBase={linkBase} />
    </PreviewShell>
  );
}
