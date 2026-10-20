import { guard } from "@/lib/auth";
import { ok, bad } from "@/lib/api";
import { loadLedger, REPORT_BUILDERS } from "@/lib/reports";

// The five formal statements plus the accountant export, all derived from committed
// journal lines. `report` selects the statement; `from`/`to` bound the period (the
// Balance Sheet and Trial Balance are cumulative as-at `to`).
export async function GET(req) {
  const { error } = await guard("finance:view");
  if (error) return error;
  const sp = req.nextUrl.searchParams;
  const report = sp.get("report") || "trialBalance";
  const builder = REPORT_BUILDERS[report];
  if (!builder) return bad(`Unknown report "${report}".`);

  const from = sp.get("from") || null;
  const to = sp.get("to") || null;
  if (from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) return bad("`from` must be YYYY-MM-DD.");
  if (to && !/^\d{4}-\d{2}-\d{2}$/.test(to)) return bad("`to` must be YYYY-MM-DD.");

  const ledger = await loadLedger({ from, to });
  const built = builder(ledger);
  return ok({ ...built, from, to, generatedAt: new Date().toISOString() });
}
