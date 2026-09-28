import { createHash } from "crypto";
import { prisma } from "./prisma.js";
import { ensurePageViewTable } from "./provision.js";

// Only these public sections are ever recorded. Anything else — /workstation,
// /api, /portal, /login, /plots and any unknown path — is rejected, so internal
// traffic cannot inflate the numbers and arbitrary URLs cannot fill the table.
const PUBLIC_ROOTS = ["/", "/about", "/contact", "/gallery", "/projects", "/status", "/terms", "/trust-info"];

export const PAGE_LABELS = {
  "/": "Homepage",
  "/about": "About Us",
  "/about/how-projects-work": "How Our Projects Work",
  "/contact": "Contact",
  "/gallery": "Photo Gallery",
  "/projects": "Projects",
  "/status": "Status",
  "/terms": "Terms & Conditions",
  "/trust-info": "Trust Info",
};

// Returns the clean public path, or null when the path must not be tracked.
export function normalizePath(raw) {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 200) return null;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("..")) return null;
  const path = raw.split("?")[0].split("#")[0];
  const allowed = PUBLIC_ROOTS.some((root) =>
    root === "/" ? path === "/" : path === root || path.startsWith(`${root}/`)
  );
  return allowed ? path : null;
}

// Salted so a unique-visitor count survives without storing raw IP addresses.
export function hashIp(ip) {
  const salt = process.env.ANALYTICS_SALT || process.env.JWT_SECRET || "mheza-analytics";
  return createHash("sha256").update(`${salt}|${ip || "unknown"}`).digest("hex");
}

export async function recordPageView(path, ip) {
  const clean = normalizePath(path);
  if (!clean) return false;
  await ensurePageViewTable();
  await prisma.pageView.create({ data: { path: clean, ipHash: hashIp(ip) } });
  return true;
}

// South African Standard Time is UTC+2 with no daylight saving, so period
// boundaries ("today", "this week") line up with the Trust's working day
// instead of resetting at 02:00 local time.
const SAST_OFFSET_MS = 2 * 60 * 60 * 1000;

export function sastStartOf(unit, from = new Date()) {
  const shifted = new Date(from.getTime() + SAST_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  if (unit === "week") shifted.setUTCDate(shifted.getUTCDate() - ((shifted.getUTCDay() + 6) % 7)); // Monday
  if (unit === "month") shifted.setUTCDate(1);
  if (unit === "year") shifted.setUTCMonth(0, 1);
  return new Date(shifted.getTime() - SAST_OFFSET_MS);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dayLabel(isoDay) {
  const [, m, d] = isoDay.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]}`;
}

async function totalsSince(since) {
  const rows = await prisma.$queryRaw`
    SELECT count(*)::int AS views, count(DISTINCT "ipHash")::int AS visitors
    FROM "PageView" WHERE "timestamp" >= ${since}`;
  return { views: rows[0]?.views ?? 0, visitors: rows[0]?.visitors ?? 0 };
}

async function dailySeries(days) {
  const start = sastStartOf("day");
  start.setTime(start.getTime() - (days - 1) * 86_400_000);
  const rows = await prisma.$queryRaw`
    SELECT to_char("timestamp" + interval '2 hours', 'YYYY-MM-DD') AS day,
           count(*)::int AS views,
           count(DISTINCT "ipHash")::int AS visitors
    FROM "PageView" WHERE "timestamp" >= ${start}
    GROUP BY 1 ORDER BY 1`;

  const byDay = new Map(rows.map((r) => [r.day, r]));
  const series = [];
  for (let i = 0; i < days; i += 1) {
    const date = new Date(start.getTime() + i * 86_400_000 + SAST_OFFSET_MS);
    const day = date.toISOString().slice(0, 10);
    const row = byDay.get(day);
    series.push({ day, label: dayLabel(day), views: row?.views ?? 0, visitors: row?.visitors ?? 0 });
  }
  return series;
}

async function topPages(since, limit = 15) {
  const rows = await prisma.$queryRaw`
    SELECT "path", count(*)::int AS views, count(DISTINCT "ipHash")::int AS visitors
    FROM "PageView" WHERE "timestamp" >= ${since}
    GROUP BY "path" ORDER BY views DESC LIMIT ${limit}`;
  return rows.map((r) => ({
    path: r.path,
    label: PAGE_LABELS[r.path] || r.path,
    views: r.views,
    visitors: r.visitors,
  }));
}

export async function getAnalytics(days = 30) {
  await ensurePageViewTable();
  const series = await dailySeries(days);
  const monthStart = sastStartOf("month");
  // Renamed away from `topPages` on purpose: a destructured const of that name
  // shadows the helper above and throws a TDZ error when it is called here.
  const [today, week, month, year, pagesThisMonth, pagesThisYear] = await Promise.all([
    totalsSince(sastStartOf("day")),
    totalsSince(sastStartOf("week")),
    totalsSince(monthStart),
    totalsSince(sastStartOf("year")),
    topPages(monthStart),
    topPages(sastStartOf("year")),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    periods: { today, week, month, year },
    daily: series,
    topPagesThisMonth: pagesThisMonth,
    topPagesThisYear: pagesThisYear,
    total: await totalsSince(new Date(0)),
  };
}
