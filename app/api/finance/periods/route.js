import { guard, audit, verifyConfirmToken } from "@/lib/auth";
import { ok, bad } from "@/lib/api";
import { listPeriods, closePeriod } from "@/lib/ledger";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const YEAR_RE = /^\d{4}$/;

// Periods the Admin can close: the last 24 months and the last 3 years, each marked
// with whether it is already closed. Reading is open to every administrator.
export async function GET() {
  const { error } = await guard("finance:view");
  if (error) return error;
  const periods = await listPeriods();
  const closedKeys = new Set(periods.filter((p) => p.status === "CLOSED").map((p) => p.periodKey));
  const closedInfo = new Map(periods.map((p) => [p.periodKey, p]));

  const now = new Date();
  const months = [];
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({
      periodKey: key,
      kind: "MONTH",
      label: d.toLocaleString("en-ZA", { month: "long", year: "numeric" }),
      closed: closedKeys.has(key),
      closedAt: closedInfo.get(key)?.closedAt ?? null,
    });
  }
  const years = [];
  for (let i = 0; i < 3; i++) {
    const key = String(now.getFullYear() - i);
    years.push({
      periodKey: key,
      kind: "YEAR",
      label: key,
      closed: closedKeys.has(key),
      closedAt: closedInfo.get(key)?.closedAt ?? null,
    });
  }
  return ok({ months, years });
}

// Closing a period is permanent and irreversible — no administrator can reopen it —
// so it is gated behind finance:admin AND a fresh password confirmation.
export async function POST(req) {
  const { user, error } = await guard("finance:admin");
  if (error) return error;
  try {
    const b = await req.json();
    if (!(await verifyConfirmToken(b.confirmToken))) {
      return bad("Password confirmation required or expired. Please try again.", 401);
    }
    const periodKey = String(b.periodKey || "").trim();
    const kind = b.kind === "YEAR" ? "YEAR" : "MONTH";
    const valid = kind === "YEAR" ? YEAR_RE.test(periodKey) : MONTH_RE.test(periodKey);
    if (!valid) return bad("That period is not a valid month (YYYY-MM) or year (YYYY).");

    // A future period has no transactions to lock yet; refuse rather than lock the
    // Trust out of recording the current month by mistake.
    const now = new Date();
    if (kind === "YEAR" && Number(periodKey) > now.getFullYear()) return bad("You cannot close a future year.");
    if (kind === "MONTH") {
      const [y, m] = periodKey.split("-").map(Number);
      if (y > now.getFullYear() || (y === now.getFullYear() && m > now.getMonth() + 1)) {
        return bad("You cannot close a future month.");
      }
    }

    const period = await closePeriod({ periodKey, kind, closedById: user.id });
    await audit(user, "PERIOD_CLOSED", "FinancialPeriod", period.id, { periodKey, kind }, null, { periodKey, kind, status: "CLOSED" });
    return ok(period);
  } catch (e) {
    return bad(e.message);
  }
}
