"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/api-client";
import { useFetch, LoadingBlock, ErrorBlock } from "@/components/ws/common";
import { usePermissions, ReadOnlyNote } from "@/components/ws/permissions";
import { Field, Alert } from "@/components/ui";
import { zarFull, dateFmt } from "@/lib/format";

const REPORTS = [
  ["trialBalance", "Trial Balance"],
  ["generalLedger", "General Ledger"],
  ["incomeStatement", "Income Statement (P&L)"],
  ["balanceSheet", "Balance Sheet"],
  ["cashFlow", "Cash Flow Statement"],
];

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const firstOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
const today = () => new Date().toISOString().slice(0, 10);

// Formal financial reporting plus the one-time opening-balance sheet. Every figure is
// derived from the ledger; where the books have no data the report simply says so.
export default function ReportsTab() {
  return (
    <div className="space-y-6">
      <OpeningBalancesPanel />
      <StatementsPanel />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Opening balances
// ---------------------------------------------------------------------------
function OpeningBalancesPanel() {
  const { can } = usePermissions();
  const canEdit = can("finance:admin");
  const { data, loading, error, reload } = useFetch("/api/finance/opening-balances");
  const [asAt, setAsAt] = useState(today());
  const [sheet, setSheet] = useState({}); // accountCode → { debit, credit }
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const accounts = data?.accounts || [];
  const balances = data?.balances || [];

  // Prefill the inputs from any sheet already keyed for the chosen date.
  function loadDate(newDate) {
    setAsAt(newDate);
    const dayStart = new Date(`${newDate}T00:00:00.000Z`).getTime();
    const existing = balances.filter((b) => new Date(b.asAt).getTime() === dayStart);
    const next = {};
    for (const b of existing) {
      const acc = accounts.find((a) => a.id === b.accountId);
      if (acc) next[acc.code] = { debit: b.debit ? String(b.debit) : "", credit: b.credit ? String(b.credit) : "" };
    }
    setSheet(next);
  }

  const setCell = (code, key) => (e) => setSheet((s) => ({ ...s, [code]: { ...(s[code] || {}), [key]: e.target.value } }));

  const totals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    for (const code of Object.keys(sheet)) {
      debit += Number(sheet[code]?.debit) || 0;
      credit += Number(sheet[code]?.credit) || 0;
    }
    return { debit: round2(debit), credit: round2(credit), diff: round2(debit - credit) };
  }, [sheet]);
  const balanced = Math.abs(totals.diff) < 0.01 && (totals.debit > 0 || totals.credit > 0);

  if (loading && !data) return <LoadingBlock label="Loading opening balances…" />;
  if (error) return <ErrorBlock message={error} />;

  async function save() {
    setBusy(true);
    setNotice(null);
    try {
      const entries = Object.keys(sheet)
        .map((code) => ({ accountCode: code, debit: Number(sheet[code]?.debit) || 0, credit: Number(sheet[code]?.credit) || 0 }))
        .filter((e) => e.debit !== 0 || e.credit !== 0);
      const res = await api.post("/api/finance/opening-balances", { asAt, entries });
      setNotice({ type: "success", text: `Opening balances posted as ${res.txnNo} (${zarFull(res.totalDebit)} across ${res.lines} accounts).` });
      reload();
    } catch (e) {
      setNotice({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  }

  const keyedDates = [...new Set(balances.map((b) => new Date(b.asAt).toISOString().slice(0, 10)))];

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
        <div>
          <h3 className="font-bold text-gray-900">Opening balances</h3>
          <p className="text-xs text-gray-500">
            Key the Trust's real account balances as at a date. The sheet must balance (debits = credits); it posts as one
            OPENING entry the Balance Sheet is built from. Nothing is estimated — leave an account blank if it has no balance.
          </p>
        </div>
        {canEdit && (
          <Field label="As at">
            <input className="input" type="date" value={asAt} onChange={(e) => loadDate(e.target.value)} />
          </Field>
        )}
      </div>

      {!canEdit && <ReadOnlyNote label="opening balances" />}
      {notice && <div className="mb-3"><Alert type={notice.type} onClose={() => setNotice(null)}>{notice.text}</Alert></div>}

      {keyedDates.length > 0 && (
        <p className="text-xs text-gray-500 mb-3">
          Already keyed: {keyedDates.map((d) => <button key={d} className="underline mr-2 cursor-pointer" onClick={() => loadDate(d)}>{dateFmt(d)}</button>)}
        </p>
      )}

      {canEdit && (
        <>
          <div className="overflow-x-auto max-h-[28rem] overflow-y-auto">
            <table className="table-base text-sm">
              <thead className="sticky top-0 bg-white">
                <tr><th>Code</th><th>Account</th><th>Type</th><th className="text-right">Debit</th><th className="text-right">Credit</th></tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id}>
                    <td className="font-mono text-xs">{a.code}</td>
                    <td>{a.name}</td>
                    <td className="text-xs text-gray-500">{a.type}</td>
                    <td><input className="input text-right py-1" type="number" min="0" step="0.01" value={sheet[a.code]?.debit || ""} onChange={setCell(a.code, "debit")} disabled={!!sheet[a.code]?.credit} /></td>
                    <td><input className="input text-right py-1" type="number" min="0" step="0.01" value={sheet[a.code]?.credit || ""} onChange={setCell(a.code, "credit")} disabled={!!sheet[a.code]?.debit} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                  <td colSpan={3} className="text-gray-700">Totals</td>
                  <td className="text-right">{zarFull(totals.debit)}</td>
                  <td className="text-right">{zarFull(totals.credit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className={`text-sm font-semibold ${balanced ? "text-forest-700" : "text-red-600"}`}>
              {totals.debit === 0 && totals.credit === 0 ? "Enter the real balances from the Trust's books." : balanced ? "Balanced" : `Out by ${zarFull(Math.abs(totals.diff))} — must balance`}
            </span>
            <div className="flex gap-2">
              <button className="btn-ghost btn-sm" onClick={() => setSheet({})}>Clear</button>
              <button className="btn-primary btn-sm" onClick={save} disabled={busy || !balanced}>{busy ? "Posting…" : "Post opening balances"}</button>
            </div>
          </div>
        </>
      )}

      {!canEdit && balances.length === 0 && (
        <p className="text-sm text-gray-500 py-4 text-center">No opening balances have been keyed.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formal statements
// ---------------------------------------------------------------------------
function StatementsPanel() {
  const [report, setReport] = useState("trialBalance");
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  // Cumulative statements ignore `from`; period statements use the range.
  const usesRange = usesRangeFor(report);

  async function generate(r = report, f = from, t = to) {
    setBusy(true);
    setErr(null);
    try {
      const qs = new URLSearchParams({ report: r });
      if (usesRangeFor(r)) { if (f) qs.set("from", f); }
      if (t) qs.set("to", t);
      setResult(await api.get(`/api/finance/reports?${qs.toString()}`));
    } catch (e) {
      setErr(e.message);
      setResult(null);
    } finally {
      setBusy(false);
    }
  }
  function usesRangeFor(r) {
    return r === "generalLedger" || r === "incomeStatement" || r === "cashFlow" || r === "accountant";
  }

  function onReportChange(r) {
    setReport(r);
    setResult(null);
    generate(r, from, to);
  }

  function exportCsv() {
    if (!result) return;
    const cols = result.columns;
    const headers = cols.map((c) => c.label || c.key);
    const rows = result.rows.map((row) => cols.map((c) => (row[c.key] ?? "")));
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `mheza-${result.report}-${to || today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4 print:hidden">
        <div>
          <h3 className="font-bold text-gray-900">Financial statements</h3>
          <p className="text-xs text-gray-500">Built from the double-entry ledger. Download as CSV or print to PDF.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Report">
            <select className="input" value={report} onChange={(e) => onReportChange(e.target.value)}>
              {REPORTS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
              <option value="accountant">Accountant Export (journal CSV)</option>
            </select>
          </Field>
          {usesRange && (
            <Field label="From">
              <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
          )}
          <Field label={usesRange ? "To" : "As at"}>
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <button className="btn-primary btn-sm" onClick={() => generate()} disabled={busy}>{busy ? "Building…" : "Run"}</button>
        </div>
      </div>

      {err && <Alert type="error">{err}</Alert>}

      {result && (
        <div id="report-print">
          <div className="text-center border-b border-gray-200 pb-3 mb-4">
            <p className="font-bold text-lg text-forest-900">THE MHEZA TRUST</p>
            <p className="text-sm font-semibold text-gray-700">{result.title}</p>
            <p className="text-xs text-gray-400">
              {usesRangeFor(result.report) && result.from ? `Period ${dateFmt(result.from)} to ${dateFmt(result.to)}` : `As at ${dateFmt(result.to)}`}
            </p>
          </div>

          {"balanced" in result && (
            <div className="mb-3">
              {result.balanced
                ? <Alert type="success">In balance.</Alert>
                : <Alert type="error">Out of balance — the ledger does not reconcile. Investigate before relying on this report.</Alert>}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="table-base text-sm">
              <thead>
                <tr>{result.columns.map((c) => <th key={c.key} className={c.align === "right" ? "text-right" : ""}>{c.label}</th>)}</tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => {
                  if (row._section) {
                    return (
                      <tr key={i} className="bg-gray-50">
                        <td colSpan={result.columns.length} className="font-bold text-gray-800 pt-3">{row.label || row.account || row.code}</td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={i} className={row._total ? "border-t-2 border-gray-400" : ""}>
                      {result.columns.map((c) => {
                        const v = row[c.key];
                        const isMoney = c.money && typeof v === "number";
                        return (
                          <td key={c.key} className={`${c.align === "right" ? "text-right" : ""} ${row._bold ? "font-bold text-gray-800" : ""} ${c.key === "txn" ? "font-mono text-xs" : ""} whitespace-nowrap`}>
                            {isMoney ? zarFull(v) : (v ?? "")}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {result.rows.length === 0 && (
                  <tr><td colSpan={result.columns.length} className="text-center text-gray-500 py-8">No ledger activity for this selection.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-gray-400 text-center print:text-gray-600">Generated {dateFmt(new Date())} · The Mheza Trust financial system.</p>

          <div className="flex justify-end gap-2 mt-4 print:hidden">
            <button className="btn-outline btn-sm" onClick={exportCsv} disabled={!result.rows.length}>Export CSV</button>
            <button className="btn-primary btn-sm" onClick={() => window.print()}>Print / Save PDF</button>
          </div>
        </div>
      )}

      {!result && !err && !busy && (
        <p className="text-sm text-gray-500 py-6 text-center">Choose a report and run it.</p>
      )}
    </div>
  );
}
