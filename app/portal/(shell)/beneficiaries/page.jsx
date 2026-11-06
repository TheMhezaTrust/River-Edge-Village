import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { loadPortalMember, parseBeneficiaries } from "@/lib/portal-data";
import { ensureMemberAccessTables } from "@/lib/provision";
import BeneficiariesView from "@/components/portal/BeneficiariesView";
import BeneficiaryChangeForm from "@/components/portal/BeneficiaryChangeForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "My Beneficiaries · Member Portal" };

export default async function PortalBeneficiariesPage() {
  const member = await loadPortalMember();
  if (!member) redirect("/portal");

  await ensureMemberAccessTables();
  const requests = await prisma.memberChangeRequest.findMany({
    where: { memberId: member.id, field: "beneficiaries" },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, status: true, reason: true, createdAt: true, decidedAt: true },
  });

  return (
    <div className="space-y-6">
      <BeneficiariesView member={member} />
      <BeneficiaryChangeForm beneficiaries={parseBeneficiaries(member.beneficiaries)} requests={requests} />
    </div>
  );
}
