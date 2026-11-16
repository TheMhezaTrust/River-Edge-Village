"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Alert, Field, Spinner, StatusPill } from "@/components/ui";
import { dateTimeFmt } from "@/lib/format";
import PageHeading from "@/components/portal/PageHeading";

const MAX_BODY = 4000;

// A member writes to the Trust here and reads the answer in the same thread. The
// office is present only as a department — the API this talks to never returns the
// name of the person who answered, so there is nothing here to redact.
export default function SupportDesk({ reasons }) {
  const [tickets, setTickets] = useState(null);
  const [listError, setListError] = useState(null);

  const [reason, setReason] = useState(reasons[0]?.value || "");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState(null);
  const [notice, setNotice] = useState(null);

  const [openId, setOpenId] = useState(null);
  const [thread, setThread] = useState(null);
  const [threadError, setThreadError] = useState(null);
  const [reply, setReply] = useState("");
  const [replying, setReplying] = useState(false);
  const [replyError, setReplyError] = useState(null);

  const loadTickets = useCallback(async () => {
    try {
      setTickets(await api.get("/api/portal/support"));
      setListError(null);
    } catch (e) {
      setListError(e.message);
    }
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  useEffect(() => {
    if (!openId) {
      setThread(null);
      return undefined;
    }
    let alive = true;
    setThreadError(null);
    setReply("");
    setReplyError(null);
    api
      .get(`/api/portal/support/${openId}`)
      .then((t) => { if (alive) setThread(t); })
      .catch((e) => { if (alive) { setThread(null); setThreadError(e.message); } });
    return () => { alive = false; };
  }, [openId]);

  const labelFor = (value) => reasons.find((r) => r.value === value)?.label || value;

  async function submit(e) {
    e.preventDefault();
    setSending(true);
    setFormError(null);
    setNotice(null);
    try {
      const ticket = await api.post("/api/portal/support", { reason, body });
      setBody("");
      setNotice(`Your message has been sent to the ${ticket.department}.`);
      await loadTickets();
      // Straight into the new thread, so the member sees their message land.
      setOpenId(ticket.id);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function sendReply(e) {
    e.preventDefault();
    setReplying(true);
    setReplyError(null);
    try {
      setThread(await api.post(`/api/portal/support/${openId}/reply`, { body: reply }));
      setReply("");
      await loadTickets();
    } catch (err) {
      setReplyError(err.message);
    } finally {
      setReplying(false);
    }
  }

  function closeThread() {
    setOpenId(null);
    setThread(null);
    setThreadError(null);
    setReply("");
    setReplyError(null);
  }

  if (openId) {
    return (
      <div className="space-y-4">
        <button type="button" className="btn-ghost btn-sm" onClick={closeThread}>← Back to my messages</button>

        {threadError && <Alert type="error" onClose={() => setThreadError(null)}>{threadError}</Alert>}

        {thread && (
          <div className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-4">
              <div>
                <h2 className="text-lg font-bold text-forest-900">{labelFor(thread.reason)}</h2>
                <p className="text-xs text-gray-500">
                  {thread.department} · opened {dateTimeFmt(thread.createdAt)}
                </p>
              </div>
              <StatusPill status={thread.status} />
            </div>

            <ul className="space-y-3 py-5">
              {thread.messages.map((m) => {
                const mine = m.senderType === "MEMBER";
                return (
                  <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-2.5 sm:max-w-[75%] ${
                        mine ? "bg-forest-700 text-white" : "border border-gray-200 bg-gray-50 text-gray-800"
                      }`}
                    >
                      <p className={`text-[11px] font-semibold ${mine ? "text-forest-200" : "text-gray-500"}`}>
                        {mine ? "You" : "The Mheza Trust"}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm">{m.body}</p>
                      <p className={`mt-1.5 text-[10px] ${mine ? "text-forest-300" : "text-gray-400"}`}>
                        {dateTimeFmt(m.createdAt)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>

            {replyError && <div className="mb-3"><Alert type="error" onClose={() => setReplyError(null)}>{replyError}</Alert></div>}

            <form onSubmit={sendReply} className="border-t border-gray-200 pt-4">
              <Field label="Write again in this thread">
                <textarea
                  className="input"
                  rows={3}
                  required
                  maxLength={MAX_BODY}
                  value={reply}
                  placeholder="Add anything else the Trust should know…"
                  onChange={(e) => setReply(e.target.value)}
                />
              </Field>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-gray-500">Replies appear here — the Trust answers as a department, not as a person.</p>
                <button type="submit" className="btn-primary btn-sm shrink-0" disabled={replying || !reply.trim()}>
                  {replying ? "Sending…" : "Send"}
                </button>
              </div>
            </form>
          </div>
        )}

        {!thread && !threadError && (
          <div className="flex items-center justify-center gap-3 py-16 text-gray-500"><Spinner /> Loading your message…</div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title="Contact the Trust"
        subtitle="Send the office a message about your plot, your payments or the Trust itself, and read their reply in the same thread."
      />

      {notice && <Alert type="success" onClose={() => setNotice(null)}>{notice}</Alert>}

      <div className="card p-5">
        <h2 className="text-base font-bold text-forest-900">New message</h2>
        <p className="mt-1 text-xs text-gray-500">
          Choose what your message is about — it decides which office receives it.
        </p>

        {formError && <div className="mt-4"><Alert type="error" onClose={() => setFormError(null)}>{formError}</Alert></div>}

        <form onSubmit={submit} className="mt-4 grid gap-4">
          <Field label="Reason for Contact" required>
            <select className="input" required value={reason} onChange={(e) => setReason(e.target.value)}>
              {reasons.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Your Message" required>
            <textarea
              className="input"
              rows={5}
              required
              maxLength={MAX_BODY}
              value={body}
              placeholder="Tell the Trust what you need help with…"
              onChange={(e) => setBody(e.target.value)}
            />
          </Field>
          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={sending || !body.trim()}>
              {sending ? "Sending…" : "Send Message"}
            </button>
          </div>
        </form>
      </div>

      <div>
        <h2 className="text-base font-bold text-forest-900 mb-3">My messages</h2>

        {listError && <Alert type="error">{listError}</Alert>}

        {!tickets && !listError && (
          <div className="flex items-center justify-center gap-3 py-12 text-gray-500"><Spinner /> Loading your messages…</div>
        )}

        {tickets?.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-sm font-semibold text-gray-700">No messages yet</p>
            <p className="mt-1 text-xs text-gray-500">When you contact the Trust, your message and their reply will appear here.</p>
          </div>
        )}

        <ul className="space-y-3">
          {(tickets || []).map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setOpenId(t.id)}
                className="card block w-full p-4 text-left transition-colors hover:bg-gray-50"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-forest-900">{labelFor(t.reason)}</p>
                  <StatusPill status={t.status} />
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  {t.department} · {dateTimeFmt(t.createdAt)} · {t.messageCount} message{t.messageCount === 1 ? "" : "s"}
                </p>
                {t.lastMessage && (
                  <p className="mt-2 truncate text-sm text-gray-600">
                    <span className="font-medium text-gray-500">
                      {t.lastMessage.senderType === "MEMBER" ? "You: " : "The Trust: "}
                    </span>
                    {t.lastMessage.body}
                  </p>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
