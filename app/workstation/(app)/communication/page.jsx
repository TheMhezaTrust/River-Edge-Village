"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { useFetch, PageHeader, LoadingBlock, ErrorBlock, ConfirmButton } from "@/components/ws/common";
import { Modal, Field, StatusPill, Alert } from "@/components/ui";
import { dateTimeFmt } from "@/lib/format";
import { can } from "@/lib/roles";

const BOXES = ["inbox", "sent", "drafts"];
const EMPTY_MSG = { toId: "", subject: "", body: "" };
const EMPTY_ANN = { title: "", body: "", category: "" };

const TEMPLATES = [
  {
    name: "Payment Reminder",
    text: "Dear [Member Name],\n\nThis is a friendly reminder that your plot instalment of R[Amount] for Erf [Number] at River Edge Rural Village is due on [Date]. Please pay into the Trust account and email your proof of payment to finance@mhezatrust.org.za.\n\nKind regards,\nThe Mheza Trust\nAdministered by River Edge Primary Co-Op",
  },
  {
    name: "Viewing Confirmation",
    text: "Dear [Inquiry Name],\n\nThank you for your interest in River Edge Rural Village. We are pleased to confirm your site viewing on [Date] at [Time]. Our administrator will meet you at the village entrance. Please bring your ID document.\n\nKind regards,\nThe Mheza Trust\nAdministered by River Edge Primary Co-Op",
  },
  {
    name: "Department Follow-up",
    text: "Dear [Contact Person],\n\nThe Mheza Trust follows up on our application submitted on [Date] regarding [Reference] for the River Edge Rural Village development. We would appreciate a status update at your earliest convenience.\n\nKind regards,\nThe Mheza Trust\nAdministered by River Edge Primary Co-Op",
  },
];

export default function CommunicationPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading communication…" />}>
      <CommunicationInner />
    </Suspense>
  );
}

function CommunicationInner() {
  const searchParams = useSearchParams();
  const initialTab = ["messages", "announcements", "templates"].includes(searchParams.get("tab")) ? searchParams.get("tab") : "messages";
  const [tab, setTab] = useState(initialTab);
  const [box, setBox] = useState("inbox");

  const { data: me } = useFetch("/api/auth/me");
  const { data: messages, loading, error, reload } = useFetch(`/api/communication/messages?box=${box}`);
  const { data: announcements, reload: reloadAnn } = useFetch("/api/communication/announcements");
  const [users, setUsers] = useState(null);

  const [selected, setSelected] = useState(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [msgForm, setMsgForm] = useState(EMPTY_MSG);
  const [annOpen, setAnnOpen] = useState(false);
  const [annForm, setAnnForm] = useState(EMPTY_ANN);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    api.get("/api/admin/users").then(setUsers).catch(() => setUsers(null));
  }, []);

  const setMsg = (k) => (e) => setMsgForm((f) => ({ ...f, [k]: e.target.value }));
  const setAnn = (k) => (e) => setAnnForm((f) => ({ ...f, [k]: e.target.value }));
  const canAnnounce = can(me, "announcements:manage");

  const unreadCount = useMemo(() => (box === "inbox" ? (messages || []).filter((m) => !m.isRead).length : 0), [messages, box]);

  async function openMessage(m) {
    setSelected(m);
    setFormError(null);
    if (box === "inbox" && !m.isRead) {
      try {
        await api.put("/api/communication/messages", { id: m.id, isRead: true });
        setSelected({ ...m, isRead: true });
        reload();
      } catch (err) {
        setFormError(err.message);
      }
    }
  }

  async function submitMessage(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.post("/api/communication/messages", { toId: Number(msgForm.toId), subject: msgForm.subject, body: msgForm.body });
      setComposeOpen(false);
      setMsgForm(EMPTY_MSG);
      setBox("sent");
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function submitAnnouncement(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.post("/api/communication/announcements", annForm);
      setAnnOpen(false);
      setAnnForm(EMPTY_ANN);
      reloadAnn();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function copyTemplate(t) {
    try {
      await navigator.clipboard.writeText(t.text);
      setCopied(t.name);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setFormError("Could not copy to clipboard.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Communication"
        subtitle="Internal messages, announcements and templates"
        actions={
          <>
            {tab === "messages" && <button className="btn-primary btn-sm" onClick={() => { setMsgForm(EMPTY_MSG); setFormError(null); setComposeOpen(true); }}>+ Compose</button>}
            {tab === "announcements" && canAnnounce && <button className="btn-primary btn-sm" onClick={() => { setAnnForm(EMPTY_ANN); setFormError(null); setAnnOpen(true); }}>+ Post Announcement</button>}
          </>
        }
      />

      <div className="flex gap-2 mb-4 border-b border-gray-200">
        {[
          { id: "messages", label: "Messages" },
          { id: "announcements", label: "Announcements" },
          { id: "templates", label: "Templates" },
        ].map((t) => (
          <button
            key={t.id}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${tab === t.id ? "border-forest-600 text-forest-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            onClick={() => { setTab(t.id); setFormError(null); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {formError && !composeOpen && !annOpen && (
        <div className="mb-4"><Alert type="error" onClose={() => setFormError(null)}>{formError}</Alert></div>
      )}

      {tab === "messages" && (
        <div>
          <div className="flex flex-wrap gap-2 mb-4 items-center">
            {BOXES.map((b) => (
              <button key={b} className={`btn-sm rounded-full px-3 border ${box === b ? "btn-primary" : "btn-outline"}`} onClick={() => { setBox(b); setSelected(null); }}>
                {b.charAt(0).toUpperCase() + b.slice(1)}{b === "inbox" && unreadCount > 0 ? ` (${unreadCount})` : ""}
              </button>
            ))}
          </div>
          {loading && !messages ? (
            <LoadingBlock label="Loading messages…" />
          ) : error ? (
            <ErrorBlock message={error} />
          ) : (
            <div className="grid gap-4 lg:grid-cols-5">
              <div className="card overflow-y-auto max-h-[32rem] lg:col-span-2">
                {(messages || []).map((m) => (
                  <button
                    key={m.id}
                    className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 ${selected?.id === m.id ? "bg-forest-50" : ""} ${!m.isRead && box === "inbox" ? "font-semibold" : ""}`}
                    onClick={() => openMessage(m)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm truncate">{box === "sent" || box === "drafts" ? `To: ${m.to?.name || "?"}` : m.from?.name || "?"}</span>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">{dateTimeFmt(m.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-700 truncate">{m.isDraft ? "[Draft] " : ""}{m.subject}</p>
                  </button>
                ))}
                {(!messages || messages.length === 0) && (
                  <p className="text-center text-gray-500 py-10 text-sm">No {box} messages.</p>
                )}
              </div>
              <div className="card p-5 lg:col-span-3">
                {selected ? (
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-semibold text-forest-900">{selected.isDraft ? "[Draft] " : ""}{selected.subject}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          From {selected.from?.name || "?"} → To {selected.to?.name || "?"} · {dateTimeFmt(selected.createdAt)}
                        </p>
                      </div>
                      {!selected.isRead && <StatusPill status="NEW" />}
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selected.body}</p>
                  </div>
                ) : (
                  <p className="text-center text-gray-400 py-16 text-sm">Select a message to read it.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "announcements" && (
        <div className="space-y-4">
          {(announcements || []).map((a) => (
            <div key={a.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-forest-900">{a.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {dateTimeFmt(a.createdAt)}{a.category ? ` · ${a.category}` : ""}
                  </p>
                </div>
                {canAnnounce && (
                  <ConfirmButton
                    label="Delete"
                    className="btn-ghost btn-sm text-red-600"
                    confirmText={`Delete announcement "${a.title}"?`}
                    onConfirm={async () => { await api.del(`/api/communication/announcements?id=${a.id}`); reloadAnn(); }}
                  />
                )}
              </div>
              <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{a.body}</p>
            </div>
          ))}
          {(!announcements || announcements.length === 0) && (
            <div className="card p-10 text-center text-gray-500 text-sm">No internal announcements yet.</div>
          )}
        </div>
      )}

      {tab === "templates" && (
        <div>
          <p className="text-xs uppercase tracking-wide font-semibold text-gray-500 mb-3">Templates (email/SMS gateway integration pending)</p>
          <div className="grid gap-4 md:grid-cols-3">
            {TEMPLATES.map((t) => (
              <div key={t.name} className="card p-5 flex flex-col">
                <h3 className="font-semibold text-forest-900 mb-2">{t.name}</h3>
                <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans flex-1 rounded-lg bg-gray-50 border border-gray-200 p-3">{t.text}</pre>
                <button className="btn-outline btn-sm mt-3 self-start" onClick={() => copyTemplate(t)}>
                  {copied === t.name ? "Copied!" : "Copy to clipboard"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compose modal */}
      <Modal open={composeOpen} onClose={() => setComposeOpen(false)} title="Compose Message">
        {formError && <div className="mb-4"><Alert type="error">{formError}</Alert></div>}
        <form onSubmit={submitMessage} className="grid gap-4">
          <Field label="Recipient" required>
            {users ? (
              <select className="input" required value={msgForm.toId} onChange={setMsg("toId")}>
                <option value="">- Select recipient -</option>
                {users.filter((u) => u.isActive !== false).map((u) => <option key={u.id} value={u.id}>{u.name}{u.title ? ` · ${u.title}` : ""}</option>)}
              </select>
            ) : (
              <input className="input" type="number" min="1" required placeholder="Recipient user ID" value={msgForm.toId} onChange={setMsg("toId")} aria-label="Recipient user ID" />
            )}
          </Field>
          <Field label="Subject" required><input className="input" required value={msgForm.subject} onChange={setMsg("subject")} /></Field>
          <Field label="Body"><textarea className="input" rows={5} value={msgForm.body} onChange={setMsg("body")} /></Field>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setComposeOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Sending…" : "Send"}</button>
          </div>
        </form>
      </Modal>

      {/* Announcement modal */}
      <Modal open={annOpen} onClose={() => setAnnOpen(false)} title="Post Announcement">
        {formError && <div className="mb-4"><Alert type="error">{formError}</Alert></div>}
        <form onSubmit={submitAnnouncement} className="grid gap-4">
          <Field label="Title" required><input className="input" required value={annForm.title} onChange={setAnn("title")} /></Field>
          <Field label="Category">
            <select className="input" value={annForm.category} onChange={setAnn("category")}>
              <option value="">- None -</option>
              <option>General</option><option>Finance</option><option>Project Update</option><option>Policy</option><option>Event</option>
            </select>
          </Field>
          <Field label="Body" required><textarea className="input" rows={5} required value={annForm.body} onChange={setAnn("body")} /></Field>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setAnnOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Posting…" : "Post"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
