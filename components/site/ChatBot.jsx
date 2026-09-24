"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// Mheza is a public-website assistant only. The member portal, staff workstation
// and the login gate live under the same (site) layout, so hide it there.
const HIDDEN_PREFIXES = ["/portal", "/workstation", "/login"];

const SUGGESTIONS = [
  "How much does a plot cost?",
  "Which plots are still available?",
  "What are the banking details?",
  "What do I actually own — a title deed?",
  "What's the rezoning status?",
  "How do I pay and what reference do I use?",
];

const GREETING =
  "Hi, I'm Mheza — The Mheza Trust assistant. Ask me about River Edge Rural Village: plots, pricing, banking, the Right of Use, or project status. I can only share public information.";

export default function ChatBot() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send(text) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setError(null);
    const next = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Something went wrong.");
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setError(e.message || "Could not reach the assistant. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  if (HIDDEN_PREFIXES.some((p) => pathname?.startsWith(p))) return null;

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close Mheza assistant" : "Open Mheza assistant"}
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-forest-700 text-white shadow-lg transition hover:bg-forest-800 focus:outline-none focus:ring-2 focus:ring-forest-300"
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.5a8.38 8.38 0 01-8.5 8.5 8.5 8.5 0 01-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 1121 11.5z" />
          </svg>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Mheza assistant"
          className="fixed bottom-24 right-5 z-50 flex h-[min(600px,80vh)] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-forest-100 bg-white shadow-2xl"
        >
          <div className="flex items-center gap-3 bg-forest-800 px-4 py-3 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest-600 text-sm font-bold">M</span>
            <div className="leading-tight">
              <p className="font-semibold">Mheza</p>
              <p className="text-xs text-forest-200">The Mheza Trust assistant</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="ml-auto rounded p-1 text-forest-200 hover:bg-forest-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-forest-300"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-earth-50 px-4 py-4" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "rounded-br-sm bg-forest-700 text-white"
                      : "rounded-bl-sm border border-forest-100 bg-white text-gray-800"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-forest-200 bg-white px-3 py-1.5 text-xs text-forest-700 transition hover:bg-forest-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm border border-forest-100 bg-white px-4 py-3 text-sm text-gray-500">
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-forest-400 [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-forest-400 [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-forest-400" />
                  </span>
                </div>
              </div>
            )}

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
            )}
          </div>

          <div className="border-t border-gray-100 bg-white p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder="Ask Mheza…"
                aria-label="Message"
                className="max-h-28 min-h-[42px] flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-200"
              />
              <button
                type="button"
                onClick={() => send()}
                disabled={loading || !input.trim()}
                aria-label="Send message"
                className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-forest-700 text-white transition hover:bg-forest-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] leading-snug text-gray-400">
              Mheza is an AI assistant and shares public information only. Verify important details by phone on{" "}
              <a href="/contact" className="underline hover:text-forest-700">Contact</a>.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
