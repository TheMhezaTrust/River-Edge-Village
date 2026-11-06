import { parseBeneficiaries } from "@/lib/portal-data";
import { EmptyState } from "@/components/ui";
import PageHeading from "@/components/portal/PageHeading";

// The member's nominated beneficiaries as the Trust currently holds them. Read-only
// and shared with the admin "View as Member" preview, so it carries no interactive
// form and no portal links — the update request form lives on the portal page itself.
export default function BeneficiariesView({ member }) {
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
    </div>
  );
}
