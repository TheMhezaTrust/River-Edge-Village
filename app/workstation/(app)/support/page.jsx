"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api-client";
import { useFetch, PageHeader, LoadingBlock, ErrorBlock } from "@/components/ws/common";
import { usePermissions, ReadOnlyNote } from "@/components/ws/permissions";
import { Modal, Field, Alert, StatusPill, Spinner } from "@/components/ui";
import { ROLES } from "@/lib/roles";
import { REASON_LABELS } from "@/lib/support";
import { dateTimeFmt } from "@/lib/format";

const STATUSES = ["OPEN", "ANSWERED"];
const MAX_BODY = 4000;

// Messages members send from the portal's "Contact the Trust" tab. What this list
// contains is decided on the server: an administrator reads every ticket, anybody
// else only the ones the routing sent to them.
export default function SupportInboxPage() {
  const { user, can } = usePermissions();
  const canReply = can("support:manage");
  const { data: tickets, loading, error, reload } = useFetch("/api/support");

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [mineOnly, setMineOnly] = useState(false);
  const [q, setQ] = useState("");

  const [viewingId, setViewingId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!viewingId) {
      setDetail(null);
      return undefined;
    }
    let alive = true;
    setDetailError(null);
    setReply("");
    setReplyError(null);
    api
      .get(`/api/support/${viewingId}`)
      .then((d) => { if (alive) setDetail(d); })
      .catch((e) => { if (alive) { setDetail(null); setDetailError(e.message); } });
    return () => { alive = false; };
  }, [viewingId]);

  const isMine = (t) => t.assignedTo.some((a) => a.id === user?.id);

  const counts = useMemo(() => {
    const c = { ALL: 0, OPEN: 0, ANSWERED: 0, MINE: 0 };
    (tickets || []).forEach((t) => {
      c.ALL += 1;
      if (c[t.status] != null) c[t.status] += 1;
      if (isMine(t)) c.MINE += 1;
    });
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets, user?.id]);

  const filtered = useMemo(() => {
    if (!tickets) return [];
    let list = tickets;
    if (statusFilter !== "ALL") list = list.filter((t) => t.status === statusFilter);
    if (mineOnly) list = list.filter(isMine);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter((t) =>
        [t.member?.fullName, t.department, t.lastMessage?.body].some((v) => (v || "").toLowerCase().includes(s))
      );
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets, statusFilter, mineOnly, q, user?.id]);

  async function sendReply(e) {
    e.preventDefault();
    setSending(true);
    setReplyError(null);
    try {
      const updated = await api.post(`/api/support/${viewingId}/reply`, { body: reply });
      setDetail((d) => (d ? { ...d, status: updated.status, updatedAt: updated.updatedAt, messages: updated.messages } : d));
      setReply("");
      setNotice(`Reply sent. ${detail?.member?.fullName || "The member"} can read it in their portal.`);
      await reload();
    } catch (err) {
      setReplyError(err.message);
    } finally {
      setSending(false);
    }
  }

  function closeView() {
    setViewingId(null);
    setDetail(null);
    setDetailError(null);
    setReply("");
    setReplyError(null);
  }

  if (loading && !tickets) return <LoadingBlock label="Loading the support inbox…" />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <div>
      <PageHeader
        title="Support Inbox"
        subtitle={`${counts.OPEN} waiting for an answer · ${counts.ANSWERED} answered · messages sent by members from the portal`}
      />

      {!canReply && <div className="mb-4"><ReadOnlyNote label="the support inbox" /></div>}

      {notice && <div className="mb-4"><Alert type="success" onClose={() => setNotice(null)}>{notice}</Alert></div>}

      <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {["ALL", ...STATUSES].map((s) => (
            <button
              key={s}
              type="button"
              className={`btn-sm rounded-full px-3 border ${statusFilter === s ? "btn-primary" : "btn-outline"}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === "ALL" ? `All (${counts.ALL})` : `${s === "OPEN" ? "Open" : "Answered"} (${counts[s]})`}
            </button>
          ))}
          <button
            type="button"
            className={`btn-sm rounded-full px-3 border ${mineOnly ? "btn-primary" : "btn-outline"}`}
            onClick={() => setMineOnly((v) => !v)}
          >
            Assigned to me ({counts.MINE})
          </button>
        </div>
        <input
          className="input max-w-xs ml-auto"
          placeholder="Search member, department or message…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search support tickets"
        />
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Member</th><th>Reason</th><th>Department</th><th>Assigned To</th><th>Status</th><th>Last Message</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id}>
                <td className="font-semibold text-forest-700 whitespace-nowrap">{t.member?.fullName || "Unknown member"}</td>
                <td className="text-xs whitespace-nowrap">{REASON_LABELS[t.reason] || t.reason}</td>
                <td className="text-xs text-gray-600 whitespace-nowrap">{t.department}</td>
                <td>
                  {t.assignedTo.length ? (
                    <ul className="text-xs text-gray-700">
                      {t.assignedTo.map((a) => (
                        <li key={a.id} className={a.id === user?.id ? "font-semibold text-forest-700" : ""}>
                          {a.name} <span className="text-gray-400">· {ROLES[a.role] || a.role}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-xs text-amber-600 font-semibold">Nobody — pick it up</span>
                  )}
                </td>
                <td><StatusPill status={t.status} /></td>
                <td className="max-w-xs">
                  {t.lastMessage ? (
                    <>
                      <p className="truncate text-xs text-gray-600">{t.lastMessage.body}</p>
                      <p className="text-[11px] text-gray-400">
                        {t.lastMessage.senderType === "MEMBER" ? "Member" : "Staff"} · {dateTimeFmt(t.lastMessage.createdAt)}
                      </p>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </td>
                <td className="whitespace-nowrap">
                  <button type="button" className="btn-ghost btn-sm" onClick={() => setViewingId(t.id)}>Open</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-gray-500 py-10">
                  {tickets?.length ? "No tickets match your filters." : "No member messages yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={!!viewingId} onClose={closeView} title={`Support ticket · ${detail?.member?.fullName || ""}`} wide>
        {detailError && <Alert type="error" onClose={() => setDetailError(null)}>{detailError}</Alert>}

        {!detail && !detailError && (
          <div className="flex items-center justify-center gap-3 py-12 text-gray-500"><Spinner /> Loading the thread…</div>
        )}

        {detail && (
          <div className="space-y-4">
            {replyError && <Alert type="error" onClose={() => setReplyError(null)}>{replyError}</Alert>}

            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={detail.status} />
              <span className="text-xs text-gray-500">
                {REASON_LABELS[detail.reason] || detail.reason} · {detail.department} · opened {dateTimeFmt(detail.createdAt)}
              </span>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="label">Assigned To</p>
              {detail.assignedTo.length ? (
                <p className="text-sm text-gray-700">
                  {detail.assignedTo.map((a) => `${a.name} (${ROLES[a.role] || a.role})`).join(", ")}
                </p>
              ) : (
                <p className="text-sm text-amber-700">
                  Nobody is assigned — the routing map names no active account for this reason.
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                The member sees only “{detail.department}”. Staff names are never shown in the portal.
              </p>
            </div>

            <ul className="max-h-96 space-y-3 overflow-y-auto py-1">
              {detail.messages.map((m) => {
                const staff = m.senderType === "STAFF";
                return (
                  <li key={m.id} className={`flex ${staff ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                        staff ? "bg-forest-700 text-white" : "border border-gray-200 bg-gray-50 text-gray-800"
                      }`}
                    >
                      <p className={`text-[11px] font-semibold ${staff ? "text-forest-200" : "text-gray-500"}`}>
                        {staff ? m.sender?.name || "Staff" : detail.member?.fullName || "Member"}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm">{m.body}</p>
                      <p className={`mt-1.5 text-[10px] ${staff ? "text-forest-300" : "text-gray-400"}`}>
                        {dateTimeFmt(m.createdAt)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>

            {canReply ? (
              <form onSubmit={sendReply} className="grid gap-3 rounded-lg border border-forest-200 bg-forest-50 p-4">
                <Field label="Reply to the member" required>
                  <textarea
                    className="input"
                    rows={4}
                    required
                    maxLength={MAX_BODY}
                    value={reply}
                    placeholder={`Dear ${detail.member?.fullName || ""}, …`}
                    onChange={(e) => setReply(e.target.value)}
                  />
                </Field>
                <p className="text-xs text-gray-500">
                  Your reply appears in the member&apos;s portal thread as coming from {detail.department}. Sending marks the
                  ticket Answered; a member writing again reopens it.
                </p>
                <div className="flex justify-end gap-2">
                  <button type="button" className="btn-ghost" onClick={closeView} disabled={sending}>Close</button>
                  <button type="submit" className="btn-primary" disabled={sending || !reply.trim()}>
                    {sending ? "Sending…" : "Send Reply"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex justify-end">
                <button type="button" className="btn-outline" onClick={closeView}>Close</button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
