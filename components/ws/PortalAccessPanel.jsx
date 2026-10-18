"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { Alert } from "@/components/ui";
import PasswordConfirmModal from "@/components/ws/PasswordConfirmModal";
import { dateTimeFmt } from "@/lib/format";

// Staff-side control for a member's portal login. Two ways in, matching how the
// office actually works: an emailed single-use link (the member never hears a
// password read out) and a temporary password for members without usable email.
export default function PortalAccessPanel({ member, canManage, reload }) {
  const [confirm, setConfirm] = useState(null); // { purpose } | { temp: true }
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [tempPassword, setTempPassword] = useState(null);
  const [busy, setBusy] = useState(false);

  const hasAccess = Boolean(member.hasPortalPassword);

  async function run(confirmToken) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (confirm?.temp) {
        const res = await api.post(`/api/members/${member.id}/portal-password`, { confirmToken });
        setTempPassword(res.tempPassword);
      } else {
        const res = await api.post(`/api/members/${member.id}/portal-access`, {
          purpose: confirm?.purpose || "ACTIVATE",
          confirmToken,
        });
        setNotice(`A sign-in link was emailed to ${member.email}. It expires at ${new Date(res.expiresAt).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}.`);
      }
      reload?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  return (
    <div className="card p-6">
      <h2 className="font-bold text-gray-900 mb-3">Member Portal Access</h2>

      <dl className="space-y-2 text-sm mb-4">
        <div className="flex justify-between gap-4">
          <dt className="text-gray-500 shrink-0">Sign-in status</dt>
          <dd className={`font-medium ${hasAccess ? "text-forest-700" : "text-amber-600"}`}>
            {hasAccess ? (member.mustChangePassword ? "Temporary password — change required" : "Can sign in") : "No password set"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-gray-500 shrink-0">Last sign-in</dt>
          <dd className="text-gray-900 font-medium">{member.lastLoginAt ? dateTimeFmt(member.lastLoginAt) : "Never"}</dd>
        </div>
      </dl>

      {error && <div className="mb-3"><Alert type="error">{error}</Alert></div>}
      {notice && <div className="mb-3"><Alert type="success" onClose={() => setNotice(null)}>{notice}</Alert></div>}

      {tempPassword && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-900">Temporary password — shown once</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 rounded bg-white border border-amber-200 px-2 py-1.5 font-mono text-sm text-gray-900 select-all">{tempPassword}</code>
            <button
              type="button"
              className="btn-outline btn-sm"
              onClick={() => navigator.clipboard?.writeText(tempPassword)}
            >
              Copy
            </button>
          </div>
          <p className="mt-2 text-xs text-amber-800">
            Give this to {member.fullName} privately. They must replace it before the portal opens.
          </p>
          <button type="button" className="mt-2 text-xs font-semibold text-amber-900 hover:underline cursor-pointer" onClick={() => setTempPassword(null)}>
            I have copied it — hide
          </button>
        </div>
      )}

      {canManage ? (
        <div className="flex flex-wrap gap-2">
          <button className="btn-outline btn-sm" disabled={busy} onClick={() => setConfirm({ purpose: hasAccess ? "RESET" : "ACTIVATE" })}>
            {hasAccess ? "Email a reset link" : "Email an access link"}
          </button>
          <button className="btn-ghost btn-sm" disabled={busy} onClick={() => setConfirm({ temp: true })}>
            Set temporary password
          </button>
        </div>
      ) : (
        <p className="text-xs text-gray-500">Only staff with member-management rights can issue portal access.</p>
      )}

      <PasswordConfirmModal
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirmed={run}
        title={confirm?.temp ? "Confirm temporary password" : "Confirm access link"}
        description={
          confirm?.temp
            ? `This replaces ${member.fullName}'s portal password immediately and forces them to choose a new one. Re-enter your password to continue.`
            : `A single-use link will be emailed to ${member.email}. It expires in 30 minutes. Re-enter your password to continue.`
        }
      />
    </div>
  );
}
