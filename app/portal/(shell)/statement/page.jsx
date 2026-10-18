import { redirect } from "next/navigation";
import Link from "next/link";
import { loadPortalMember } from "@/lib/portal-data";
import { memberTotals } from "@/lib/member-totals";
import { zarFull, dateFmt, dateTimeFmt, METHOD_LABELS } from "@/lib/format";
import { TRUST } from "@/lib/contact";
import PrintButton from "@/components/portal/PrintButton";
import BankingDetails from "@/components/portal/BankingDetails";

export const dynamic = "force-dynamic";

export const metadata = { title: "Statement of Account · Member Portal" };

// A formal statement the member can print or save as PDF and keep, or hand to a
// bank or attorney. Everything on it is drawn from the member's own record.
export default async function PortalStatementPage() {
  const member = await loadPortalMember();
  if (!member) redirect("/portal");

  const { price, totalPaid, outstandingBalance } = memberTotals(member);
  const payments = [...member.payments].sort((a, b) => new Date(a.date) - new Date(b.date));
  const generatedAt = dateTimeFmt(new Date());
  const statementNo = `RE-${String(member.id).padStart(5, "0")}-${new Date().getFullYear()}`;
  // The contract date the office recorded, falling back to when the record was
  // opened for members whose paperwork predates this system.
  const purchasedOn = member.purchaseDate || member.createdAt;

  let running = 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold text-forest-900">Statement of Account</h1>
          <p className="mt-1 text-sm text-gray-500">Print it or save it as a PDF from the dialog that opens.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/portal/payments" className="btn-ghost btn-sm">← Back to payments</Link>
          <PrintButton />
        </div>
      </div>

      <div className="card p-8 print:border-0 print:p-0 print:shadow-none">
        {/* Letterhead */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-5">
          <div className="flex items-center gap-3">
            <img
              src="/images/trust-logo.jpg"
              alt=""
              className="h-12 w-12 rounded-lg object-cover"
              width={48}
              height={48}
            />
            <div>
              <p className="text-lg font-bold text-forest-900">{TRUST.legalName}</p>
              <p className="text-xs text-gray-500">Registration {TRUST.registrationNumber}</p>
              <p className="text-xs text-gray-500">{TRUST.email} · {TRUST.primaryPhone}</p>
            </div>
          </div>
          <div className="text-right text-xs text-gray-600">
            <p className="text-sm font-bold text-gray-900">STATEMENT OF ACCOUNT</p>
            <p>Statement no. {statementNo}</p>
            <p>Generated {generatedAt}</p>
          </div>
        </div>

        {/* Parties */}
        <div className="mt-6 grid gap-6 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Statement to</p>
            <p className="mt-1 font-bold text-gray-900">{member.fullName}</p>
            {member.idNumber && <p className="text-gray-600">ID {member.idNumber}</p>}
            <p className="text-gray-600">{member.email}</p>
            <p className="text-gray-600">{member.phone}</p>
            {member.physicalAddress && <p className="text-gray-600">{member.physicalAddress}</p>}
            <p className="text-gray-600">Date of purchase {dateFmt(purchasedOn)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Plot held</p>
            {member.plots.length === 0 ? (
              <p className="mt-1 text-gray-600">No plot allocated.</p>
            ) : (
              <ul className="mt-1 space-y-1 text-gray-700">
                {member.plots.map((p) => (
                  <li key={p.id}>
                    Plot {p.number}{p.block ? ` (Block ${p.block})` : ""}, {p.sizeSqm} m² — {p.project?.name || "River Edge Rural Village"}
                    {p.purchasedAt && <span className="text-gray-500"> · purchased {dateFmt(p.purchasedAt)}</span>}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-gray-500">Held as a heritable Right of Use under the Terms and Conditions of Sale.</p>
          </div>
        </div>

        {/* Schedule */}
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Schedule of payments</p>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-2 font-semibold">Date</th>
                <th className="py-2 font-semibold">Reference</th>
                <th className="py-2 font-semibold">Method</th>
                <th className="py-2 text-right font-semibold">Amount</th>
                <th className="py-2 text-right font-semibold">Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-600">{dateFmt(purchasedOn)}</td>
                <td className="py-2 text-gray-600">Purchase price</td>
                <td className="py-2 text-gray-600">—</td>
                <td className="py-2 text-right text-gray-600">({zarFull(price)})</td>
                <td className="py-2 text-right font-medium text-gray-900">{zarFull(price)}</td>
              </tr>
              {payments.map((p) => {
                running += p.amount || 0;
                return (
                  <tr key={p.id} className="border-b border-gray-100">
                    <td className="py-2 text-gray-700">{dateFmt(p.date)}</td>
                    <td className="py-2 text-gray-600">{p.reference || p.note || "—"}</td>
                    <td className="py-2 text-gray-600">{METHOD_LABELS[p.method] || p.method}</td>
                    <td className="py-2 text-right text-forest-700">{zarFull(p.amount)}</td>
                    <td className="py-2 text-right font-medium text-gray-900">{zarFull(Math.max(0, price - running))}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 font-bold">
                <td className="py-2" colSpan={3}>Total paid to date</td>
                <td className="py-2 text-right text-forest-700">{zarFull(totalPaid)}</td>
                <td className="py-2 text-right" />
              </tr>
              <tr className="font-bold">
                <td className="py-2" colSpan={3}>Outstanding balance</td>
                <td className="py-2 text-right" colSpan={2}>
                  <span className={outstandingBalance > 0 ? "text-red-600" : "text-forest-700"}>{zarFull(outstandingBalance)}</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Banking */}
        {outstandingBalance > 0 && (
          <div className="mt-8 rounded-lg border border-gray-200 p-4 print:border-gray-400">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Banking details for payment</p>
            <BankingDetails member={member} />
          </div>
        )}

        <div className="mt-8 border-t border-gray-200 pt-4 text-xs leading-relaxed text-gray-500">
          <p>
            This statement was generated from the member portal of {TRUST.legalName} and reflects the payments
            recorded by the Trust as at {generatedAt}. It is a record of account, not a tax invoice and not proof of
            ownership. Land is held in trust; the member holds a heritable Right of Use under the Terms and
            Conditions of Sale.
          </p>
          <p className="mt-2">
            Query this statement with the Trust office on {TRUST.primaryPhone} or {TRUST.email}, quoting statement
            no. {statementNo}.
          </p>
        </div>
      </div>
    </div>
  );
}
