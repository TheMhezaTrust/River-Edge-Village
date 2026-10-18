import { redirect } from "next/navigation";
import Link from "next/link";
import { loadPortalMember } from "@/lib/portal-data";
import { memberTotals } from "@/lib/member-totals";
import { zarFull } from "@/lib/format";
import { StatusPill, EmptyState } from "@/components/ui";
import PageHeading from "@/components/portal/PageHeading";
import { MapPinIcon } from "@/components/portal/Icons";

export const dynamic = "force-dynamic";

export const metadata = { title: "My Plot Details · Member Portal" };

export default async function PortalPlotPage() {
  const member = await loadPortalMember();
  if (!member) redirect("/portal");

  const { price, totalPaid, outstandingBalance } = memberTotals(member);
  const plots = member.plots;

  return (
    <div className="space-y-6">
      <PageHeading
        title="My Plot Details"
        subtitle="The plot or plots registered to you at River Edge Rural Village."
      />

      {plots.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No plot allocated yet"
            message="Your plot has not been registered against your name yet. Please contact the Trust office."
          />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {plots.map((plot) => {
            const plotPaid = plot.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
            const plotBalance = Math.max(0, (plot.price || 0) - plotPaid);
            return (
              <div key={plot.id} className="card p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="flex items-center gap-2 text-lg font-bold text-forest-900">
                      <MapPinIcon width={18} height={18} />
                      Plot {plot.number}
                      {plot.block && <span className="font-medium text-gray-500">· Block {plot.block}</span>}
                    </h2>
                    <p className="mt-0.5 text-sm text-gray-500">{plot.project?.name || "River Edge Rural Village"}</p>
                  </div>
                  <StatusPill status={plot.status} />
                </div>

                <dl className="mt-5 divide-y divide-gray-100 text-sm">
                  {[
                    ["Project name", plot.project?.name || "River Edge Rural Village"],
                    ["Plot number", plot.block ? `${plot.number} (Block ${plot.block})` : plot.number],
                    ["Plot size", `${plot.sizeSqm} m²`],
                    ["Purchase price", zarFull(plot.price)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 py-2.5">
                      <dt className="text-gray-500">{k}</dt>
                      <dd className="font-medium text-gray-900 text-right">{v}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between gap-4 py-2.5">
                    <dt className="text-gray-500">Paid on this plot</dt>
                    <dd className="font-medium text-forest-700 text-right">{zarFull(plotPaid)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2.5">
                    <dt className="text-gray-500">Balance on this plot</dt>
                    <dd className={`font-medium text-right ${plotBalance > 0 ? "text-red-600" : "text-gray-900"}`}>{zarFull(plotBalance)}</dd>
                  </div>
                </dl>

                <div className="mt-4 rounded-lg bg-earth-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-earth-700">Right of Use</p>
                  <p className="mt-1.5 text-sm text-gray-700">
                    {plotBalance > 0
                      ? `Active — instalments in progress. ${zarFull(plotBalance)} is still outstanding on this plot.`
                      : "Active — this plot is paid in full."}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-gray-500">
                    You hold a heritable <strong>Right of Use</strong> of this erf — not a title deed and not land
                    ownership. Ownership stays with The Mheza Trust until transfer to the Community Property
                    Association. See the{" "}
                    <Link href="/terms" className="font-semibold text-forest-700 hover:underline">Terms and Conditions of Sale</Link>.
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card p-6">
        <h2 className="text-lg font-bold text-forest-900">Certificate of Land Use</h2>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">
          Your Certificate of Land Use will be available for download here once it has been issued by the Trust.
          Until then nothing is required from you — the Trust issues certificates itself and will notify you.
        </p>
        <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5 text-center">
          <p className="text-sm font-medium text-gray-500">No certificate issued yet</p>
          <p className="mt-1 text-xs text-gray-400">It will appear in this box as a download.</p>
        </div>
      </div>

      {plots.length > 1 && (
        <div className="card p-5">
          <p className="text-sm text-gray-600">
            You hold {plots.length} plots. Across all of them you have paid{" "}
            <strong className="text-forest-700">{zarFull(totalPaid)}</strong> of{" "}
            <strong>{zarFull(price)}</strong>
            {outstandingBalance > 0 && <> — <strong className="text-red-600">{zarFull(outstandingBalance)}</strong> outstanding</>}.
            Payments are recorded against a plot when the reference makes it clear which one; see{" "}
            <Link href="/portal/payments" className="font-semibold text-forest-700 hover:underline">Payments &amp; Statement</Link>.
          </p>
        </div>
      )}
    </div>
  );
}
