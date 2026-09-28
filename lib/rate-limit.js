// Best-effort fixed-window limiter. On Vercel every serverless instance keeps
// its own counters, so this slows an attacker down rather than guaranteeing a
// global ceiling — the durable lockout for password recovery lives on the
// SecurityQuestion row (failedAttempts / lockedUntil).
const windows = new Map();

export function rateLimit(key, { limit = 5, windowMs = 60_000 } = {}) {
  const now = Date.now();
  if (windows.size > 5000) {
    for (const [k, v] of windows) if (now - v.start > 3_600_000) windows.delete(k);
  }
  const entry = windows.get(key);
  if (!entry || now - entry.start >= windowMs) {
    windows.set(key, { start: now, count: 1 });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }
  entry.count += 1;
  if (entry.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.start + windowMs - now) / 1000)),
    };
  }
  return { allowed: true, remaining: limit - entry.count, retryAfterSeconds: 0 };
}

export function clientIp(req) {
  const xff = req?.headers?.get?.("x-forwarded-for");
  return (xff ? xff.split(",")[0].trim() : "unknown").slice(0, 45);
}
