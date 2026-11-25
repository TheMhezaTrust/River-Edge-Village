import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, created, bad } from "@/lib/api";
import { ensureSiteReportTable } from "@/lib/provision";
import { normalizeReport, reportAccessWhere, REPORT_SELECT } from "@/lib/site-reports";

// The ground-work feed. An administrator reads every report; a site manager reads only
// the ones they wrote. That rule is not repeated here — reportAccessWhere is the single
// place it lives, so this list and any future single-report read cannot drift apart.
export async function GET() {
  const { user, error } = await guard("sitereports:view");
  if (error) return error;

  await ensureSiteReportTable();
  const reports = await prisma.siteReport.findMany({
    where: reportAccessWhere(user.role, user.id),
    // Newest work first, then newest entry first for work logged on the same day.
    orderBy: [{ workDate: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    take: 200,
    select: REPORT_SELECT,
  });

  return ok(reports);
}

// Append-only: there is no PUT and no DELETE anywhere in this module, for any role.
// A report records work that already happened, so it stays as the person who did the
// work wrote it — an administrator who needs something corrected asks the site
// manager to log a follow-up rather than rewriting history.
export async function POST(req) {
  const { user, error } = await guard("sitereports:manage");
  if (error) return error;

  const b = await req.json();
  const report = normalizeReport(b);
  if (report.error) return bad(report.error);

  // Only a real http(s) address may be stored: the feed renders this in an <img src>
  // and a link, so a javascript: or data: value must never reach the database.
  let photoUrl = null;
  let photoName = null;
  if (b.photoUrl) {
    let parsed;
    try {
      parsed = new URL(String(b.photoUrl));
    } catch {
      return bad("That photo address is not valid.");
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return bad("That photo address is not valid.");
    }
    photoUrl = parsed.toString();
    photoName =
      String(b.photoName || "")
        .replace(/[^a-zA-Z0-9._ -]/g, "_")
        .slice(0, 120) || null;
  }

  await ensureSiteReportTable();
  const row = await prisma.siteReport.create({
    data: { ...report.data, photoUrl, photoName, createdById: user.id },
    select: REPORT_SELECT,
  });

  await audit(user, "SITE_REPORT_LOGGED", "SiteReport", row.id, row.title);
  return created(row);
}
