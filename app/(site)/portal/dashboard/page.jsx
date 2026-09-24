import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPortalSession } from "@/lib/auth";
import { zar, zarFull, dateFmt, dateTimeFmt } from "@/lib/format";
import { portalDocumentUrl } from "@/lib/files";
import { memberTotals } from "@/lib/member-totals";
import { StatusPill } from "@/components/ui";
import { LogoutButton, UploadDocument, EditContact, ChangePassword } from "@/components/site/PortalActions";

export const metadata = { title: "Member Dashboard" };
export const dynamic = "force-dynamic";

const DOC_CATEGORIES = [
  ["ID_COPY", "Certified ID Copy"],
  ["BENEFICIARY_FORM", "Beneficiary Nomination Form"],
  ["BUILDING_PLAN", "Building Plan"],
  ["CERTIFICATE", "Certificate"],
  ["OTHER", "Other"],
];

export default async function PortalDashboard() {
  const session = await getPortalSession();
  if (!session) redirect("/portal");

  const [member, project] = await Promise.all([
    prisma.member.findUnique({
      where: { id: session.id },
      include: {
        plots: { include: { project: true }, orderBy: { number: "asc" } },
        payments: { orderBy: { date: "desc" } },
        documents: { orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.project.findUnique({ where: { slug: "river-edge" } }),
  ]);
  if (!member || !member.isActive) redirect("/portal");

  const announcements = await prisma.announcement.findMany({ where: { audience: "PUBLIC" }, orderBy: { createdAt: "desc" }, take: 3 });
  const timelineSource = member.plots[0]?.project?.timeline ?? project?.timeline;
  const timeline = timelineSource ? JSON.parse(timelineSource) : [];

  const { price, totalPaid, outstandingBalance: outstanding } = memberTotals(member);
  const progress = price > 0 ? Math.min(100, Math.round((totalPaid / price) * 100)) : 0;
  const parsedBeneficiaries = member.beneficiaries ? JSON.parse(member.beneficiaries) : [];
  const beneficiaries = Array.isArray(parsedBeneficiaries) ? parsedBeneficiaries : parsedBeneficiaries?.name ? [parsedBeneficiaries] : [];
  const referencePlot = member.plots[0]?.number || "000";

  return (
    <section className="py-10 bg-earth-50 min-h-[80vh]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-forest-900">Welcome, {member.fullName.split(" ")[0]}</h1>
            <p className="text-sm text-gray-500 mt-1">{member.email} · Member since {dateFmt(member.createdAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            <EditContact member={member} />
            <ChangePassword />
            <LogoutButton />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Plot info */}
            <div className="card p-6">
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-bold text-forest-900">{member.plots.length === 1 ? "My Plot" : "My Plots"}</h2>
                <span className="text-sm text-gray-500">{member.plots.length} plot(s)</span>
              </div>
              {member.plots.length > 0 ? (
                <>
                  <div className="mt-4 space-y-3">
                    {member.plots.map((p) => (
                      <div key={p.id} className="rounded-lg bg-earth-50 p-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-gray-900">Plot {p.number} <span className="font-medium text-gray-500">(Block {p.block})</span></p>
                          <p className="text-xs text-gray-500 mt-0.5">{p.sizeSqm}m² · {zarFull(p.price)}</p>
                        </div>
                        <StatusPill status={p.status} />
                      </div>
                    ))}
                  </div>
                  <div className="mt-5">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">Overall payment progress</span>
                      <span className="font-bold text-forest-700">{progress}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-gray-200 overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                      <div className="h-full rounded-full bg-forest-600 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-gray-500">
                      <span>Paid: <strong className="text-forest-700">{zarFull(totalPaid)}</strong></span>
                      <span>Outstanding: <strong className={outstanding > 0 ? "text-red-600" : "text-forest-700"}>{zarFull(outstanding)}</strong></span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm text-gray-500">No plot assigned yet. Contact the Trust office.</p>
              )}
            </div>

            {/* Payment history */}
            <div className="card overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-bold text-forest-900">Payment History</h2>
                <span className="text-sm text-gray-500">{member.payments.length} payment(s)</span>
              </div>
              {member.payments.length === 0 ? (
                <p className="p-6 text-sm text-gray-500">No payments recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table-base">
                    <thead><tr><th>Date</th><th>Description</th><th>Method</th><th>Reference</th><th className="text-right">Amount</th></tr></thead>
                    <tbody>
                      {member.payments.map((p) => (
                        <tr key={p.id}>
                          <td className="whitespace-nowrap">{dateFmt(p.date)}</td>
                          <td>{p.note || "Payment"}</td>
                          <td>{p.method}</td>
                          <td className="font-mono text-xs text-gray-500">{p.reference || "-"}</td>
                          <td className="text-right font-bold text-forest-700 whitespace-nowrap">{zarFull(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Documents */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-forest-900">My Documents</h2>
                <UploadDocument categories={DOC_CATEGORIES} />
              </div>
              {member.documents.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No documents uploaded yet. Please upload your certified ID copy and beneficiary nomination form.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {member.documents.map((d) => {
                    const cat = DOC_CATEGORIES.find(([v]) => v === d.category)?.[1] || d.category;
                    return (
                      <li key={d.id} className="py-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-sm text-gray-900">{d.title}</p>
                          <p className="text-xs text-gray-500">{cat} · uploaded {dateTimeFmt(d.createdAt)}</p>
                        </div>
                        {d.filePath && d.filePath !== "#" ? (
                          <a href={portalDocumentUrl(d.filePath)} target="_blank" rel="noreferrer" className="btn-outline btn-sm">Download</a>
                        ) : (
                          <span className="text-xs text-gray-400">On file at office</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="mt-4 rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800">
                📜 Your <strong>Certificate of Land Use</strong> will become available for download here once issued by the municipality.
              </div>
            </div>

            {/* Beneficiaries */}
            <div className="card p-6">
              <h2 className="text-lg font-bold text-forest-900 mb-4">Beneficiary Details</h2>
              {beneficiaries.length === 0 ? (
                <p className="text-sm text-gray-500">No beneficiaries nominated yet. Please complete a beneficiary nomination form and upload it above.</p>
              ) : (
                <ul className="space-y-2">
                  {beneficiaries.map((b, i) => (
                    <li key={i} className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm">
                      <span className="font-medium text-gray-900">{b.name}</span>
                      <span className="text-gray-500">{b.relation}{b.share ? ` · ${b.share}` : ""}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Outstanding balance / pay */}
            {outstanding > 0 && (
              <div className="card p-6 border-2 border-sunset-500/40 bg-sunset-500/5">
                <h2 className="text-lg font-bold text-forest-900">Outstanding Balance</h2>
                <p className="mt-1 text-3xl font-extrabold text-sunset-500">{zarFull(outstanding)}</p>
                <div className="mt-4 text-sm text-gray-700 space-y-1.5">
                  <p className="font-semibold">Pay by EFT:</p>
                  <p>Absa · River Edge SA Primary Co-operative Ltd</p>
                  <p className="font-mono text-xs">Acc 4121013447 · Branch 632005</p>
                  <p className="font-semibold mt-3">Reference (mandatory):</p>
                  <p className="font-mono text-xs bg-white border border-gray-200 rounded px-2 py-1.5">
                    {referencePlot} – {member.fullName}
                  </p>
                  {member.plots.length > 1 && (
                    <p className="text-xs text-gray-500 mt-1">Paying for a different plot? Use that plot's number in place of {referencePlot} (format: Plot Number – Buyer Name).</p>
                  )}
                </div>
                <p className="mt-4 text-xs text-gray-500">Email proof of payment to themhezatrust@gmail.com for same-day allocation.</p>
              </div>
            )}

            {/* Project progress */}
            <div className="card p-6">
              <h2 className="text-lg font-bold text-forest-900 mb-4">Project Progress</h2>
              <ol className="space-y-3">
                {timeline.map((t) => (
                  <li key={t.label} className="flex items-start gap-2.5 text-sm">
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${t.status === "COMPLETED" ? "bg-forest-500" : t.status === "PENDING" ? "bg-amber-400" : "bg-blue-500"}`} aria-hidden />
                    <div>
                      <p className="font-medium text-gray-900">{t.label}</p>
                      <p className="text-xs text-gray-500">{t.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <Link href="/status" className="btn-ghost btn-sm mt-4 px-0 text-forest-700 font-semibold">Full status report →</Link>
            </div>

            {/* News */}
            <div className="card p-6">
              <h2 className="text-lg font-bold text-forest-900 mb-4">Latest Updates</h2>
              <div className="space-y-4">
                {announcements.map((a) => (
                  <article key={a.id}>
                    <p className="text-xs text-gray-400">{dateFmt(a.createdAt)}</p>
                    <h3 className="font-semibold text-sm text-forest-900">{a.title}</h3>
                  </article>
                ))}
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="card p-6">
              <h2 className="text-lg font-bold text-forest-900 mb-2">Terms &amp; Conditions of Sale</h2>
              <p className="text-xs text-gray-500 mb-4">The rules that govern your Right of Use at River Edge Rural Village.</p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex gap-2"><span aria-hidden>•</span><span>You hold a heritable <strong>Right of Use</strong> — the title deed stays with The Mheza Trust until transfer to the CPA.</span></li>
                <li className="flex gap-2"><span aria-hidden>•</span><span>Late payments attract <strong>2% interest per month</strong>; non-payment can lead to forfeiture after 12 months.</span></li>
                <li className="flex gap-2"><span aria-hidden>•</span><span>Build within <strong>12 months</strong> (or 24 with approved extension), respecting the 5 m front / 2 m side / 3 m rear setbacks.</span></li>
                <li className="flex gap-2"><span aria-hidden>•</span><span>A <strong>5 000-litre</strong> rainwater tank and <strong>2 500-litre</strong> septic tank (serviced yearly) are required.</span></li>
              </ul>
              <Link href="/terms" className="btn-outline btn-sm mt-4 w-full justify-center">Read the full Terms and Conditions →</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
