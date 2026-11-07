import { prisma } from "@/lib/prisma";
import { loadPreviewMember } from "@/lib/preview";
import { ensureMemberAccessTables } from "@/lib/provision";
import { dateFmt } from "@/lib/format";
import PreviewShell from "@/components/portal/PreviewShell";
import PageHeading from "@/components/portal/PageHeading";
import { StatusPill } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Profile (Preview)", robots: { index: false } };

export default async function ProfilePreviewPage({ params }) {
  const { id } = await params;
  const member = await loadPreviewMember(id);

  await ensureMemberAccessTables();
  const requests = await prisma.memberChangeRequest.findMany({
    where: { memberId: member.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, field: true, currentValue: true, proposedValue: true, reason: true, status: true, createdAt: true, decidedAt: true },
  });

  const FIELD_LABELS = { fullName: "Full name", idNumber: "ID number", beneficiaries: "Beneficiaries" };

  return (
    <PreviewShell member={member} active="profile">
      <div className="space-y-6">
        <PageHeading
          title="My Profile"
          subtitle="Your personal details as the Trust holds them. You can keep your contact details current yourself; changes to your name or ID number go to the Trust for approval."
        />

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <strong>Preview mode:</strong> Interactive features (photo upload, contact editing, password change) are not
          functional here. Log in as the member on <code>/login</code> to test them.
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Contact details (read-only mirror of ProfileEditor) */}
            <div className="card p-6">
              <h2 className="text-lg font-bold text-forest-900 mb-4">Your details</h2>
              <dl className="space-y-3 text-sm">
                {[
                  ["Full name", member.fullName],
                  ["ID number", member.idNumber],
                  ["Date of birth", member.dateOfBirth ? dateFmt(member.dateOfBirth) : null],
                  ["Gender", member.gender],
                  ["Marital status", member.maritalStatus],
                  ["Phone", member.phone],
                  ["Email", member.email],
                  ["Physical address", member.physicalAddress],
                  ["Postal address", member.postalAddress],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b border-gray-100 pb-2 last:border-0">
                    <dt className="text-gray-500 shrink-0">{k}</dt>
                    <dd className="text-gray-900 font-medium text-right">{v || "—"}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-xs text-gray-500">
                Your name and ID number cannot be edited here — submit a correction request and the Trust office
                will review it.
              </p>
            </div>

            {/* Change requests (read-only) */}
            {requests.length > 0 && (
              <div className="card p-6">
                <h2 className="text-lg font-bold text-forest-900 mb-3">Your change requests</h2>
                <ul className="space-y-2 text-sm">
                  {requests.map((r) => (
                    <li key={r.id} className="rounded-lg bg-gray-50 px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-gray-900">{FIELD_LABELS[r.field] || r.field}</span>
                        <StatusPill status={r.status} />
                      </div>
                      {r.field !== "beneficiaries" && (
                        <p className="mt-1 text-xs text-gray-600">
                          {r.currentValue || "(blank)"} → <span className="font-medium">{r.proposedValue}</span>
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-gray-400">
                        Requested {dateFmt(r.createdAt)}
                        {r.decidedAt ? ` · decided ${dateFmt(r.decidedAt)}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Profile photo (read-only display) */}
            <div className="card p-6">
              <h2 className="font-bold text-forest-900 mb-3">Profile photo</h2>
              {member.photoUrl ? (
                <div className="flex justify-center">
                  <div className="h-32 w-32 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/members/${member.id}/photo`}
                      alt={`${member.fullName} profile photo`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-6">No photo uploaded yet.</p>
              )}
              <p className="mt-3 text-xs text-gray-500 text-center">
                The member can upload a JPG or PNG (up to 5 MB) from their own portal session.
              </p>
            </div>

            {/* Date joined */}
            <div className="card p-5">
              <h2 className="font-bold text-forest-900 mb-2">Date joined</h2>
              <p className="text-sm font-medium text-gray-900">{dateFmt(member.purchaseDate || member.createdAt)}</p>
              <p className="mt-2 text-xs leading-relaxed text-gray-500">
                This is the purchase date the Trust holds for this member. Each of their plots also carries its own
                purchase date under My Plot.
              </p>
            </div>

            {/* Privacy note */}
            <div className="card p-5">
              <h2 className="font-bold text-forest-900 mb-2">Your information is private</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                This portal only ever shows the member&apos;s own record. Other members&apos; details, the
                Trust&apos;s internal finances and the landowner&apos;s contract are not available here to anyone.
              </p>
              <p className="mt-3 text-xs text-gray-500 leading-relaxed">
                Members are signed out automatically after 15 minutes of inactivity.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}
