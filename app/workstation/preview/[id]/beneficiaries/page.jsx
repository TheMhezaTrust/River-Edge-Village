import { loadPreviewMember } from "@/lib/preview";
import PreviewShell from "@/components/portal/PreviewShell";
import BeneficiariesView from "@/components/portal/BeneficiariesView";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Beneficiaries (Preview)", robots: { index: false } };

export default async function BeneficiariesPreviewPage({ params }) {
  const { id } = await params;
  const member = await loadPreviewMember(id);
  return (
    <PreviewShell member={member} active="beneficiaries">
      <BeneficiariesView member={member} />
    </PreviewShell>
  );
}
