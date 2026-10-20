import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/auth";
import { ok, bad } from "@/lib/api";
import { saTaxYearRange } from "@/lib/ledger";
import { TRUST } from "@/lib/contact";

// Annual IT3(t) summary for a South African tax year (1 March – end February), one
// row per beneficiary who received a payout. SARS requires a Trust to report
// distributions to beneficiaries; this is generated purely from the distributions
// register, so a year with no payouts produces an empty (and truthful) report.
export async function GET(req) {
  const { error } = await guard("finance:view");
  if (error) return error;
  const year = Number(req.nextUrl.searchParams.get("year"));
  if (!year || year < 2000 || year > 2100) return bad("A valid tax year is required (e.g. 2026).");

  const { start, end } = saTaxYearRange(year);
  const distributions = await prisma.distribution.findMany({
    where: { date: { gte: start, lte: end } },
    orderBy: { date: "asc" },
  });

  const byRecipient = new Map();
  for (const d of distributions) {
    const key = `${d.recipientName}||${d.recipientIdNumber || ""}`;
    if (!byRecipient.has(key)) {
      byRecipient.set(key, {
        recipientName: d.recipientName,
        recipientIdNumber: d.recipientIdNumber || "",
        incomeDistribution: 0,
        capitalReturn: 0,
        total: 0,
        count: 0,
      });
    }
    const row = byRecipient.get(key);
    if (d.nature === "CAPITAL_RETURN") row.capitalReturn += d.amount;
    else row.incomeDistribution += d.amount;
    row.total += d.amount;
    row.count += 1;
  }

  const rows = [...byRecipient.values()].map((r) => ({
    ...r,
    incomeDistribution: Math.round(r.incomeDistribution * 100) / 100,
    capitalReturn: Math.round(r.capitalReturn * 100) / 100,
    total: Math.round(r.total * 100) / 100,
  }));

  return ok({
    taxYear: year,
    periodLabel: `1 March ${year - 1} – 28/29 February ${year}`,
    start,
    end,
    trust: { legalName: TRUST.legalName, registrationNumber: TRUST.registrationNumber },
    rows,
    totals: {
      recipients: rows.length,
      incomeDistribution: Math.round(rows.reduce((s, r) => s + r.incomeDistribution, 0) * 100) / 100,
      capitalReturn: Math.round(rows.reduce((s, r) => s + r.capitalReturn, 0) * 100) / 100,
      grand: Math.round(rows.reduce((s, r) => s + r.total, 0) * 100) / 100,
    },
  });
}
