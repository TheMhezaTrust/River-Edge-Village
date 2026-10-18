"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { useFetch } from "@/components/ws/common";
import { Alert } from "@/components/ui";
import PasswordConfirmModal from "@/components/ws/PasswordConfirmModal";
import { dateTimeFmt } from "@/lib/format";

const FIELD_LABELS = { fullName: "Full name", idNumber: "ID number" };

// Portal members cannot edit their own name or ID number — those identify the plot
// holder on the Trust's records — so the requests land here for the office to decide.
export default function MemberChangeRequests({ canManage }) {
  const { data: requests, loading, reload } = useFetch("/api/members/change-requests?status=PENDING");
  const [pending, setPending] = useState(null); // { id, decision, label }
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function decide(confirmToken) {
    setBusy(true);
    setError(null);
    try {
      await api.put(`/api/members/change-requests/${pending.id}`, { decision: pending.decision, confirmToken });
      setPending(null);
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading && !requests) return null;
  if (!requests?.length) return null;

  return (
    <div className="card p-5 mb-4 border-amber-200 bg-amber-50/40">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="font-bold text-gray-900">
          Portal change requests <span className="text-amber-700">({requests.length})</span>
        </h2>
        <span className="text-xs text-gray-500">Name and ID changes need your approval</span>
      </div>

      {error && <div className="mb-3"><Alert type="error">{error}</Alert></div>}

      <ul className="space-y-2">
        {requests.map((r) => (
          <li key={r.id} className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  <Link href={`/workstation/members/${r.memberId}`} className="text-forest-700 hover:underline">{r.member?.fullName || `Member #${r.memberId}`}</Link>
                  <span className="ml-2 font-normal text-gray-500">{FIELD_LABELS[r.field] || r.field}</span>
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  <span className="line-through text-gray-400">{r.currentValue || "(blank)"}</span>
                  <span className="mx-2 text-gray-400">→</span>
                  <span className="font-medium text-gray-900">{r.proposedValue}</span>
                </p>
                {r.reason && <p className="mt-1 text-xs text-gray-500">Reason: {r.reason}</p>}
                <p className="mt-1 text-xs text-gray-400">Requested {dateTimeFmt(r.createdAt)}</p>
              </div>
              {canManage && (
                <div className="flex shrink-0 gap-2">
                  <button
                    className="btn-primary btn-sm"
                    disabled={busy}
                    onClick={() => setPending({ id: r.id, decision: "APPROVE", label: `${FIELD_LABELS[r.field] || r.field} for ${r.member?.fullName}` })}
                  >
                    Approve
                  </button>
                  <button
                    className="btn-ghost btn-sm text-red-600"
                    disabled={busy}
                    onClick={() => setPending({ id: r.id, decision: "REJECT", label: `${FIELD_LABELS[r.field] || r.field} for ${r.member?.fullName}` })}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      <PasswordConfirmModal
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        onConfirmed={decide}
        title={pending?.decision === "APPROVE" ? "Approve change" : "Reject change"}
        description={
          pending?.decision === "APPROVE"
            ? `Approving updates the ${pending?.label} on the member record immediately. Re-enter your password to continue.`
            : `This rejects the ${pending?.label} request and leaves the record as it is. Re-enter your password to continue.`
        }
      />
    </div>
  );
}
