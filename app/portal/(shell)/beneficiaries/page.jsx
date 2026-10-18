import { redirect } from "next/navigation";
import { loadPortalMember, parseBeneficiaries } from "@/lib/portal-data";
import { EmptyState } from "@/components/ui";
import PageHeading from "@/components/portal/PageHeading";
import { TRUST } from "@/lib/contact";

export const dynamic = "force-dynamic";

export const metadata = { title: "My Beneficiaries · Member Portal" };

export default async function PortalBeneficiariesPage() {
  const member = await loadPortalMember();
  if (!member) redirect("/portal");

  const beneficiaries = parseBeneficiaries(member.beneficiaries);

  return (
    <div className="space-y-6">
      <PageHeading
        title="My Beneficiaries"
        subtitle="Who your Right of Use passes to. These are the nominations the Trust currently holds on your record."
      />

      <div className="card overflow-hidden">
        {beneficiaries.length === 0 ? (
          <EmptyState
            title="No beneficiaries nominated"
            message="You have not nominated anyone yet, or the Trust has not captured your nomination form."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>ID Number</th>
                  <th>Relationship</th>
                  <th className="text-right">Percentage Share</th>
                </tr>
              </thead>
              <tbody>
                {beneficiaries.map((b, i) => (
                  <tr key={i}>
                    <td className="font-medium text-gray-900">{b.name}</td>
                    <td className="font-mono text-xs text-gray-500">{b.idNumber || "—"}</td>
                    <td>{b.relation || b.relationship || "—"}</td>
                    <td className="text-right">{b.share || b.percentage || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-bold text-forest-900">Changing your beneficiaries</h2>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">
          A beneficiary nomination has to be signed, so it cannot be edited on this portal. Complete a{" "}
          <strong>Beneficiary Nomination Form</strong>, sign it, and hand it to the Trust office — the office
          captures it and your nominations above are updated.
        </p>
        <p className="mt-3 text-sm text-gray-600">
          To get a form, or if you are not sure your nominations are correct, call {TRUST.primaryPhone} or email{" "}
          <a href={`mailto:${TRUST.email}`} className="font-semibold text-forest-700 hover:underline">{TRUST.email}</a>.
        </p>
        <p className="mt-4 rounded-lg bg-earth-50 p-3 text-xs text-gray-600">
          Downloading the blank form here, and uploading a signed copy straight to the Trust, is being added to the
          portal next. Until then the office issues and receives the paper form.
        </p>
      </div>
    </div>
  );
}
