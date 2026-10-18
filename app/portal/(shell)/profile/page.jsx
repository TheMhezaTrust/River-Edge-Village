import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { loadPortalMember } from "@/lib/portal-data";
import { ensureMemberAccessTables } from "@/lib/provision";
import PageHeading from "@/components/portal/PageHeading";
import ProfileEditor from "@/components/portal/ProfileEditor";
import IdentityChangeRequests from "@/components/portal/IdentityChangeRequests";
import ChangePortalPassword from "@/components/portal/ChangePortalPassword";

export const dynamic = "force-dynamic";

export const metadata = { title: "My Profile · Member Portal" };

export default async function PortalProfilePage() {
  const member = await loadPortalMember();
  if (!member) redirect("/portal");

  await ensureMemberAccessTables();
  const requests = await prisma.memberChangeRequest.findMany({
    where: { memberId: member.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, field: true, currentValue: true, proposedValue: true, reason: true, status: true, createdAt: true, decidedAt: true },
  });

  return (
    <div className="space-y-6">
      <PageHeading
        title="My Profile"
        subtitle="Your personal details as the Trust holds them. You can keep your contact details current yourself; changes to your name or ID number go to the Trust for approval."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ProfileEditor
            member={{
              fullName: member.fullName,
              idNumber: member.idNumber,
              dateOfBirth: member.dateOfBirth,
              gender: member.gender,
              maritalStatus: member.maritalStatus,
              physicalAddress: member.physicalAddress,
              postalAddress: member.postalAddress,
              phone: member.phone,
              email: member.email,
            }}
          />
          <IdentityChangeRequests member={{ fullName: member.fullName, idNumber: member.idNumber }} requests={requests} />
        </div>

        <div className="space-y-6">
          <ChangePortalPassword />

          <div className="card p-5">
            <h2 className="font-bold text-forest-900 mb-2">Your information is private</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              This portal only ever shows your own record. Other members&apos; details, the Trust&apos;s internal
              finances and the landowner&apos;s contract are not available here to anyone.
            </p>
            <p className="mt-3 text-xs text-gray-500 leading-relaxed">
              You are signed out automatically after 15 minutes of inactivity. If any detail above is wrong and you
              cannot correct it yourself, contact the Trust office.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
