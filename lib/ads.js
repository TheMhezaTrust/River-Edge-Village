// Shared validation and revenue maths for the Ad Manager. Kept out of the route
// handlers so create and update cannot drift apart, and out of the client bundle
// (nothing here imports Prisma).

export const DEFAULT_DURATION_MS = 3000;
const MIN_DURATION_MS = 500;
const MAX_DURATION_MS = 600_000;

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

function text(value, max) {
  const s = typeof value === "string" ? value.trim() : "";
  return s ? s.slice(0, max) : null;
}

// An advertiser's destination and the creative in Blob storage are both absolute
// http(s) URLs. Anything else — a javascript: URL, a bare domain, a stray path —
// is rejected rather than stored, because both end up in an href or an img src.
function urlOrNull(value, label, errors) {
  const s = text(value, 2000);
  if (!s) return null;
  try {
    const parsed = new URL(s);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("bad protocol");
    return parsed.toString();
  } catch {
    errors.push(`${label} must be a full http or https address.`);
    return null;
  }
}

export function normalizeAd(b = {}) {
  const errors = [];
  const companyName = text(b.companyName, 160) || "";
  if (!companyName) errors.push("Company name is required.");

  const contactEmail = text(b.contactEmail, 200);
  if (contactEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail)) {
    errors.push("The contact email address is not valid.");
  }

  const rawDuration = b.displayDurationMs;
  let displayDurationMs = DEFAULT_DURATION_MS;
  if (rawDuration !== undefined && rawDuration !== null && rawDuration !== "") {
    const n = Number(rawDuration);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < MIN_DURATION_MS || n > MAX_DURATION_MS) {
      errors.push(`Display duration must be a whole number of milliseconds between ${MIN_DURATION_MS} and ${MAX_DURATION_MS}.`);
    } else {
      displayDurationMs = n;
    }
  }

  const rawSort = Number(b.sortOrder);
  const sortOrder = Number.isFinite(rawSort) && rawSort >= 0 ? Math.trunc(rawSort) : 0;

  return {
    companyName,
    contactName: text(b.contactName, 160),
    contactPhone: text(b.contactPhone, 40),
    contactEmail,
    notes: text(b.notes, 1000),
    imageUrl: urlOrNull(b.imageUrl, "The image address", errors),
    destinationUrl: urlOrNull(b.destinationUrl, "The destination address", errors),
    displayDurationMs,
    isActive: b.isActive === undefined ? true : !!b.isActive,
    sortOrder,
    error: errors.length ? errors.join(" ") : null,
  };
}

export function normalizeAdPayment(b = {}) {
  const errors = [];
  const amount = Number(b.amount);
  if (!Number.isFinite(amount) || amount <= 0) errors.push("Enter an amount greater than zero.");

  const date = b.date ? new Date(b.date) : new Date();
  if (Number.isNaN(date.getTime())) errors.push("The payment date is not valid.");

  const method = ["EFT", "CASH", "CARD", "OTHER"].includes(b.method) ? b.method : "EFT";
  const status = b.status === "INVOICED" ? "INVOICED" : "RECEIVED";

  return {
    amount: round2(amount),
    date,
    method,
    status,
    reference: text(b.reference, 120),
    note: text(b.note, 500),
    error: errors.length ? errors.join(" ") : null,
  };
}

// Cash flow across every advertiser: what has been booked, what has actually
// arrived, and what is still on invoice. `ads` is the list with payments included,
// exactly as the Ad Manager API returns it.
export function adRevenue(ads = []) {
  const now = new Date();
  const thisKey = monthKey(now);
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevKey = monthKey(prev);
  const last30Cutoff = Date.now() - 30 * 86_400_000;

  const out = {
    advertisers: ads.length,
    activeAds: ads.filter((a) => a.isActive).length,
    payments: 0,
    booked: 0,
    received: 0,
    outstanding: 0,
    thisMonth: 0,
    lastMonth: 0,
    last30Days: 0,
  };

  for (const ad of ads) {
    for (const p of ad.payments || []) {
      const amount = Number(p.amount) || 0;
      const when = new Date(p.date);
      const key = monthKey(when);
      out.payments += 1;
      out.booked = round2(out.booked + amount);
      if (p.status === "INVOICED") out.outstanding = round2(out.outstanding + amount);
      else out.received = round2(out.received + amount);
      if (key === thisKey) out.thisMonth = round2(out.thisMonth + amount);
      if (key === prevKey) out.lastMonth = round2(out.lastMonth + amount);
      if (when.getTime() >= last30Cutoff) out.last30Days = round2(out.last30Days + amount);
    }
  }

  return out;
}

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
