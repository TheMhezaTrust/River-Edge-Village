import { ok, bad } from "@/lib/api";
import { buildSystemPrompt } from "@/lib/chat-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE_URL = (process.env.LLM_BASE_URL || "https://api.deepseek.com/v1").replace(/\/+$/, "");
const MODEL = process.env.LLM_MODEL || "deepseek-chat";
const MAX_HISTORY = 12; // messages sent to the model (plus the system prompt)
const MAX_CHARS = 2000; // per-message cap
const REQUEST_TIMEOUT_MS = 30000;

// Lightweight in-memory limiter. Per-process only (resets on restart); adequate
// for a single long-running Node server. Swap for a shared store if scaled out.
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 30;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  rec.count += 1;
  return rec.count > RATE_MAX;
}

function clientIp(req) {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "local";
}

function sanitize(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant"))
    .slice(-MAX_HISTORY)
    .map((m) => ({
      role: m.role,
      content: String(m.content ?? "").slice(0, MAX_CHARS).trim(),
    }))
    .filter((m) => m.content.length > 0);
}

export async function POST(req) {
  const ip = clientIp(req);
  if (rateLimited(ip)) {
    return bad("You've sent too many messages. Please try again in a few minutes.", 429);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid request body.");
  }

  const history = sanitize(body?.messages);
  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return bad("Please send a message.");
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return ok({
      reply:
        "I'm not connected to the AI service yet (no DEEPSEEK_API_KEY configured). " +
        "Meanwhile, you can find pricing and plots at /plots, banking and Trust details at /trust-info, " +
        "the sale terms at /terms, project status at /status, or contact us at /contact.",
    });
  }

  try {
    const system = await buildSystemPrompt();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let data;
    try {
      const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.3,
          max_tokens: 700,
          stream: false,
          messages: [{ role: "system", content: system }, ...history],
        }),
        signal: controller.signal,
      });
      data = await res.json().catch(() => null);
      if (!res.ok) {
        console.error("[chat] provider error", res.status, data?.error?.message || "");
        return bad("The assistant is temporarily unavailable. Please try again shortly, or contact the Trust directly.");
      }
    } finally {
      clearTimeout(timer);
    }

    const reply = data?.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return bad("The assistant returned an empty reply. Please try again.");
    }
    return ok({ reply });
  } catch (e) {
    if (e?.name === "AbortError") {
      return bad("The assistant took too long to respond. Please try again.");
    }
    console.error("[chat] unexpected error", e?.message || e);
    return bad("Something went wrong. Please try again, or contact the Trust directly.");
  }
}
