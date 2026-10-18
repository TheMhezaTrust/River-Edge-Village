import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { loadPortalMember, parseBeneficiaries } from "@/lib/portal-data";
import { memberTotals } from "@/lib/member-totals";
import { zarFull, dateFmt } from "@/lib/format";
import { StatusPill, StatCard } from "@/components/ui";
import BankingDetails from "@/components/portal/BankingDetails";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function PortalDashboard() {
  const member = await loadPortalMember();
  if (!member) redirect("/portal");

  const announcements = await prisma.announcement.findMany({
    where: { audience: "PUBLIC" },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  const { price, totalPaid, outstandingBalance } = memberTotals(member);
  const progress = price > 0 ? Math.min(100, Math.round((totalPaid / price) * 100)) : 0;
  const beneficiaries = parseBeneficiaries(member.beneficiaries);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-forest-900">Welcome, {member.fullName.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-gray-500">Member since {dateFmt(member.purchaseDate || member.createdAt)} · {member.email}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total paid" value={zarFull(totalPaid)} sub={`of ${zarFull(price)}`} accent="forest" />
        <StatCard
          label="Outstanding balance"
          value={zarFull(outstandingBalance)}
          sub={outstandingBalance > 0 ? "EFT details under Payments" : "Paid in full — thank you"}
          accent={outstandingBalance > 0 ? "sunset" : "forest"}
        />
        <StatCard
          label={member.plots.length === 1 ? "Plot" : "Plots"}
          value={member.plots.length ? member.plots.map((p) => p.number).join(", ") : "—"}
          sub={member.plots.length ? "River Edge Rural Village" : "Not allocated yet"}
          accent="trust"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-bold text-forest-900">Payment progress</h2>
              <Link href="/portal/payments" className="text-sm font-semibold text-forest-700 hover:underline">Full history →</Link>
            </div>
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-medium text-gray-700">{progress}% paid</span>
                <span className="font-bold text-forest-700">{zarFull(totalPaid)}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-gray-200" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-forest-600 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
            {member.payments.length > 0 ? (
              <ul className="mt-5 divide-y divide-gray-100 text-sm">
                {member.payments.slice(0, 3).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="text-gray-700">{dateFmt(p.date)} · {p.note || "Payment"}</span>
                    <span className="font-bold text-forest-700 whitespace-nowrap">{zarFull(p.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-gray-500">No payments recorded yet.</p>
            )}
          </div>

          <div className="card p-6">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-bold text-forest-900">{member.plots.length === 1 ? "My plot" : "My plots"}</h2>
              <Link href="/portal/plot" className="text-sm font-semibold text-forest-700 hover:underline">Details →</Link>
            </div>
            {member.plots.length > 0 ? (
              <div className="mt-4 space-y-3">
                {member.plots.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-earth-50 p-4">
                    <div>
                      <p className="font-bold text-gray-900">Plot {p.number} <span className="font-medium text-gray-500">(Block {p.block || "—"})</span></p>
                      <p className="mt-0.5 text-xs text-gray-500">{p.sizeSqm}m² · {zarFull(p.price)}</p>
                    </div>
                    <StatusPill status={p.status} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-500">No plot assigned yet. Please contact the Trust office.</p>
            )}
          </div>

          <div className="card p-6">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-bold text-forest-900">Beneficiaries</h2>
              <Link href="/portal/beneficiaries" className="text-sm font-semibold text-forest-700 hover:underline">View →</Link>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              {beneficiaries.length > 0
                ? `${beneficiaries.length} nominated on your record.`
                : "No beneficiaries nominated yet."}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {outstandingBalance > 0 && (
            <div className="card border-2 border-sunset-500/40 bg-sunset-500/5 p-6">
              <h2 className="text-lg font-bold text-forest-900">Outstanding balance</h2>
              <p className="mt-1 text-3xl font-extrabold text-sunset-500">{zarFull(outstandingBalance)}</p>
              <div className="mt-4"><BankingDetails member={member} /></div>
            </div>
          )}

          <div className="card p-6">
            <h2 className="mb-4 text-lg font-bold text-forest-900">Latest updates</h2>
            {announcements.length === 0 ? (
              <p className="text-sm text-gray-500">Nothing new from the Trust at the moment.</p>
            ) : (
              <div className="space-y-4">
                {announcements.map((a) => (
                  <article key={a.id}>
                    <p className="text-xs text-gray-400">{dateFmt(a.createdAt)}</p>
                    <h3 className="text-sm font-semibold text-forest-900">{a.title}</h3>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-bold text-forest-900">Terms &amp; Conditions of Sale</h2>
            <p className="mt-2 text-sm text-gray-600">
              The rules that govern your Right of Use at River Edge Rural Village, including payment terms,
              building obligations and the Trust's undertakings.
            </p>
            <Link href="/terms" className="btn-outline btn-sm mt-4 w-full justify-center">Read the full terms →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
