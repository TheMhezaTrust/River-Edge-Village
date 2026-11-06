"use client";

import { useFetch, LoadingBlock, ErrorBlock } from "@/components/ws/common";
import { zarFull, dateFmt, METHOD_LABELS } from "@/lib/format";

const FIELD_LABELS = {
  amount: "Amount",
  date: "Date",
  method: "Method",
  reference: "Reference",
  note: "Note",
  plotId: "Plot",
};

function fmt(field, value) {
  if (value == null || value === "") return "—";
  if (field === "amount") return zarFull(value);
  if (field === "date") return dateFmt(value);
  if (field === "method") return METHOD_LABELS[value] || value;
  if (field === "plotId") return `#${value}`;
  return String(value);
}

// Read-only trail of every correction and deletion made to this member's payments.
// The entries are written by the payments/[id] route; this only displays them so an
// administrator can see who changed recorded income, when, and from what to what.
export default function PaymentAuditLog({ memberId, plots = [] }) {
  const { data: entries, loading, error } = useFetch(`/api/members/${memberId}/payment-audit`);

  const plotNumber = (id) => plots.find((p) => p.id === id)?.number ?? `#${id}`;
  const fmtField = (field, value) => (field === "plotId" && value != null && value !== "" ? `Plot ${plotNumber(value)}` : fmt(field, value));

  if (loading && !entries) return <LoadingBlock label="Loading payment audit log…" />;
  if (error) return <ErrorBlock message={error} />;
  if (!entries || entries.length === 0) {
    return <p className="p-6 text-sm text-gray-500">No payment corrections or deletions recorded for this member.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="table-base">
        <thead>
          <tr><th>When</th><th>By</th><th>Action</th><th>Changes</th><th>Income</th></tr>
        </thead>
        <tbody>
          {entries.map((e) => {
            const changed = e.before && e.after
              ? Object.keys(e.after).filter((k) => JSON.stringify(e.before[k] ?? null) !== JSON.stringify(e.after[k] ?? null))
              : [];
            return (
              <tr key={e.id}>
                <td className="whitespace-nowrap text-xs text-gray-500">{dateFmt(e.at)}</td>
                <td className="whitespace-nowrap text-sm">{e.by}</td>
                <td className="whitespace-nowrap">
                  {e.action === "PAYMENT_DELETED" ? (
                    <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">Deleted</span>
                  ) : (
                    <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">Corrected</span>
                  )}
                </td>
                <td className="text-sm">
                  {e.action === "PAYMENT_DELETED" ? (
                    <span className="text-gray-700">
                      Removed {fmt("amount", e.amount)} received {fmt("date", e.date)}{e.reference ? ` (ref ${e.reference})` : ""}
                    </span>
                  ) : changed.length === 0 ? (
                    <span className="text-gray-400">No field changes</span>
                  ) : (
                    <ul className="space-y-0.5">
                      {changed.map((k) => (
                        <li key={k} className="text-gray-700">
                          <span className="text-gray-500">{FIELD_LABELS[k] || k}:</span>{" "}
                          <span className="text-gray-400 line-through">{fmtField(k, e.before[k])}</span>{" "}
                          <span className="font-medium text-forest-700">{fmtField(k, e.after[k])}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="whitespace-nowrap text-xs">
                  {e.incomeSynced === true ? <span className="text-forest-700">Synced</span>
                    : e.incomeSynced === false ? <span className="text-amber-700" title="Income row could not be matched automatically">Manual</span>
                    : <span className="text-gray-400">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
