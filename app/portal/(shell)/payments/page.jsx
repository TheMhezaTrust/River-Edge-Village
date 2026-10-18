import { redirect } from "next/navigation";
import Link from "next/link";
import { loadPortalMember } from "@/lib/portal-data";
import { memberTotals } from "@/lib/member-totals";
import { zarFull, dateFmt, METHOD_LABELS } from "@/lib/format";
import { StatusPill, StatCard, EmptyState } from "@/components/ui";
import PageHeading from "@/components/portal/PageHeading";
import BankingDetails from "@/components/portal/BankingDetails";
import { TRUST } from "@/lib/contact";

export const dynamic = "force-dynamic";

export const metadata = { title: "Payments & Statement · Member Portal" };

export default async function PortalPaymentsPage() {
  const member = await loadPortalMember();
  if (!member) redirect("/portal");

  const { price, totalPaid, outstandingBalance } = memberTotals(member);
  const progress = price > 0 ? Math.min(100, Math.round((totalPaid / price) * 100)) : 0;
  const payments = member.payments;
  const plotNumber = (plotId) => member.plots.find((p) => p.id === plotId)?.number;

  return (
    <div className="space-y-6">
      <PageHeading
        title="Payment History & Statement"
        subtitle="Every payment the Trust has recorded against your plot."
        action={
          <Link href="/portal/statement" className="btn-primary btn-sm">Download PDF Statement</Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total amount paid" value={zarFull(totalPaid)} sub={`${progress}% of ${zarFull(price)}`} accent="forest" />
        <StatCard
          label="Outstanding balance"
          value={zarFull(outstandingBalance)}
          sub={outstandingBalance > 0 ? "Banking details below" : "Paid in full — thank you"}
          accent={outstandingBalance > 0 ? "sunset" : "forest"}
        />
        <StatCard label="Payments recorded" value={String(payments.length)} sub={payments[0] ? `Last on ${dateFmt(payments[0].date)}` : "None yet"} accent="trust" />
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-forest-900">Payment history</h2>
          <span className="text-sm text-gray-500">{payments.length} payment(s)</span>
        </div>

        {payments.length === 0 ? (
          <EmptyState
            title="No payments recorded yet"
            message="Once the Trust office captures your first payment it will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Date</th>
                  <th className="text-right">Amount</th>
                  <th>Payment Reference</th>
                  <th>Payment Method</th>
                  <th>Plot</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap">{dateFmt(p.date)}</td>
                    <td className="whitespace-nowrap text-right font-bold text-forest-700">{zarFull(p.amount)}</td>
                    <td className="font-mono text-xs text-gray-500">{p.reference || "—"}</td>
                    <td>{METHOD_LABELS[p.method] || p.method}</td>
                    <td>{p.plotId ? `Plot ${plotNumber(p.plotId) || "?"}` : "General"}</td>
                    <td><StatusPill status="CONFIRMED" /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                  <td>Total paid</td>
                  <td className="text-right text-forest-700">{zarFull(totalPaid)}</td>
                  <td colSpan={2} />
                  <td>Balance</td>
                  <td className={outstandingBalance > 0 ? "text-red-600" : "text-forest-700"}>{zarFull(outstandingBalance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-lg font-bold text-forest-900">How to pay</h2>
          <div className="mt-4"><BankingDetails member={member} /></div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-bold text-forest-900">Your statement</h2>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
            The statement is a formal record of your plot, the purchase price, every payment received and your
            balance. Open it and use your browser&apos;s print or &ldquo;Save as PDF&rdquo; — the layout is already
            set up for A4.
          </p>
          <Link href="/portal/statement" className="btn-outline btn-sm mt-4 w-full justify-center">Open my statement →</Link>
          <p className="mt-4 text-xs text-gray-500">
            Every payment listed here was captured by the Trust office. If you have paid and it does not appear,
            send your proof of payment to{" "}
            <a href={`mailto:${TRUST.email}`} className="font-semibold text-forest-700 hover:underline">{TRUST.email}</a>{" "}
            and quote your plot number.
          </p>
        </div>
      </div>
    </div>
  );
}
