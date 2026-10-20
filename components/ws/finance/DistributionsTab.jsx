"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { useFetch, LoadingBlock, ErrorBlock, ConfirmButton } from "@/components/ws/common";
import { usePermissions, ReadOnlyNote } from "@/components/ws/permissions";
import { Modal, Field, Alert } from "@/components/ui";
import { zarFull, dateFmt } from "@/lib/format";

const NATURES = [
  ["INCOME_DISTRIBUTION", "Income distribution"],
  ["CAPITAL_RETURN", "Capital return"],
];
const natureLabel = (n) => NATURES.find(([v]) => v === n)?.[1] || n;

// The South African tax year runs 1 March to the end of February, so a date in
// October 2026 belongs to tax year 2027.
function currentTaxYear() {
  const now = new Date();
  return now.getMonth() >= 2 ? now.getFullYear() + 1 : now.getFullYear();
}

// Money the Trust pays OUT to a beneficiary. Members normally pay the Trust for an
// erf rather than the other way round, so this register stays empty until a real
// payout is recorded — and an empty IT3(t) is the truthful answer, not a gap.
export default function DistributionsTab() {
  const { can } = usePermissions();
  const canEdit = can("finance:admin");

  const { data: distributions, loading, error, reload } = useFetch("/api/finance/distributions");
  const { data: members } = useFetch("/api/members");
  const [addOpen, setAddOpen] = useState(false);
  const [notice, setNotice] = useState(null);

  if (loading && !distributions) return <LoadingBlock label="Loading distributions…" />;
  if (error) return <ErrorBlock message={error} />;

  const total = (distributions || []).reduce((s, d) => s + d.amount, 0);

  return (
    <div className="space-y-6">
      {!canEdit && <ReadOnlyNote label="distributions" />}
      {notice && <Alert type={notice.type} onClose={() => setNotice(null)}>{notice.text}</Alert>}

      <div className="card p-5 print:hidden">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-gray-900">Distributions register</h3>
            <p className="text-xs text-gray-500">
              {distributions.length} payout{(distributions.length === 1 ? "" : "s")} · total{" "}
              <strong className="text-gray-700">{zarFull(total)}</strong>
            </p>
          </div>
          {canEdit && <button className="btn-primary btn-sm" onClick={() => setAddOpen(true)}>+ Record distribution</button>}
        </div>
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr><th>Date</th><th>Recipient</th><th>ID Number</th><th>Nature</th><th>Note</th><th className="text-right">Amount</th><th></th></tr>
            </thead>
            <tbody>
              {distributions.map((d) => (
                <tr key={d.id}>
                  <td className="whitespace-nowrap">{dateFmt(d.date)}</td>
                  <td className="font-medium">{d.recipientName}</td>
                  <td className="text-xs text-gray-600">{d.recipientIdNumber || "-"}</td>
                  <td className="text-xs">{natureLabel(d.nature)}</td>
                  <td className="text-xs text-gray-500">{d.note || "-"}</td>
                  <td className="text-right font-semibold whitespace-nowrap">{zarFull(d.amount)}</td>
                  <td>
                    {canEdit && (
                      <ConfirmButton
                        className="btn-ghost btn-sm text-red-600"
                        confirmText={`Delete distribution to ${d.recipientName} (${zarFull(d.amount)})?`}
                        onConfirm={async () => {
                          try {
                            await api.del(`/api/finance/distributions?id=${d.id}`);
                            setNotice({ type: "success", text: "Distribution deleted." });
                            reload();
                          } catch (e) {
                            setNotice({ type: "error", text: e.message });
                          }
                        }}
                      />
                    )}
                  </td>
                </tr>
              ))}
              {distributions.length === 0 && (
                <tr><td colSpan={7} className="text-center text-gray-500 py-10">No distributions recorded. The Trust has not paid out to any beneficiary yet.</td></tr>
              )}
            </tbody>
            {distributions.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-gray-50">
                  <td colSpan={5} className="font-bold text-gray-700">Total</td>
                  <td className="text-right font-bold whitespace-nowrap">{zarFull(total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <It3tPanel />

      <DistributionModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        members={members || []}
        onDone={() => { reload(); setNotice({ type: "success", text: "Distribution recorded and posted to the ledger." }); }}
      />
    </div>
  );
}

function It3tPanel() {
  const years = Array.from({ length: 5 }, (_, i) => currentTaxYear() - i);
  const [year, setYear] = useState(currentTaxYear());
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function generate(y = year) {
    setBusy(true);
    setErr(null);
    try {
      setReport(await api.get(`/api/finance/distributions/it3t?year=${y}`));
    } catch (e) {
      setErr(e.message);
      setReport(null);
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    if (!report || !report.rows.length) return;
    const headers = ["Recipient", "ID Number", "Income Distribution", "Capital Return", "Total"];
    const rows = report.rows.map((r) => [r.recipientName, r.recipientIdNumber || "", r.incomeDistribution, r.capitalReturn, r.total]);
    rows.push(["TOTAL", "", report.totals.incomeDistribution, report.totals.capitalReturn, report.totals.grand]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `mheza-it3t-${report.taxYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4 print:hidden">
        <div>
          <h3 className="font-bold text-gray-900">Annual IT3(t)</h3>
          <p className="text-xs text-gray-500">Per-beneficiary distribution summary for a South African tax year (1 March – end February).</p>
        </div>
        <div className="flex items-end gap-2">
          <Field label="Tax year">
            <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {years.map((y) => <option key={y} value={y}>{y - 1}/{String(y).slice(2)}</option>)}
            </select>
          </Field>
          <button className="btn-primary btn-sm" onClick={() => generate()} disabled={busy}>{busy ? "Loading…" : "Generate"}</button>
        </div>
      </div>

      {err && <Alert type="error">{err}</Alert>}

      {report && (
        <div id="it3t-print">
          <div className="text-center border-b border-gray-200 pb-3 mb-4">
            <p className="font-bold text-lg text-forest-900">{report.trust.legalName.toUpperCase()}</p>
            <p className="text-xs text-gray-500">Trust registration {report.trust.registrationNumber}</p>
            <p className="text-sm font-semibold text-gray-700 mt-1">IT3(t) — Distribution summary for tax year {report.taxYear}</p>
            <p className="text-xs text-gray-400">{report.periodLabel}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr><th>Beneficiary</th><th>ID Number</th><th className="text-right">Income distribution</th><th className="text-right">Capital return</th><th className="text-right">Total</th></tr>
              </thead>
              <tbody>
                {report.rows.map((r, i) => (
                  <tr key={i}>
                    <td className="font-medium">{r.recipientName}</td>
                    <td className="text-xs text-gray-600">{r.recipientIdNumber || "-"}</td>
                    <td className="text-right whitespace-nowrap">{zarFull(r.incomeDistribution)}</td>
                    <td className="text-right whitespace-nowrap">{zarFull(r.capitalReturn)}</td>
                    <td className="text-right font-semibold whitespace-nowrap">{zarFull(r.total)}</td>
                  </tr>
                ))}
                {report.rows.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-gray-500 py-8">No distributions were made in this tax year. Nothing is reportable to SARS.</td></tr>
                )}
              </tbody>
              {report.rows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                    <td colSpan={2} className="text-gray-700">Totals ({report.totals.recipients} beneficiar{report.totals.recipients === 1 ? "y" : "ies"})</td>
                    <td className="text-right whitespace-nowrap">{zarFull(report.totals.incomeDistribution)}</td>
                    <td className="text-right whitespace-nowrap">{zarFull(report.totals.capitalReturn)}</td>
                    <td className="text-right whitespace-nowrap">{zarFull(report.totals.grand)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <p className="mt-4 text-xs text-gray-400 text-center print:text-gray-600">
            Generated {dateFmt(new Date())} · The Mheza Trust financial system. This summary is derived from the distributions register; confirm figures with the Trust's accountant before submitting to SARS.
          </p>

          <div className="flex justify-end gap-2 mt-4 print:hidden">
            <button className="btn-outline btn-sm" onClick={exportCsv} disabled={!report.rows.length}>Export CSV</button>
            <button className="btn-primary btn-sm" onClick={() => window.print()}>Print / Save PDF</button>
          </div>
        </div>
      )}
    </div>
  );
}

function DistributionModal({ open, onClose, members, onDone }) {
  const today = () => new Date().toISOString().slice(0, 10);
  const blank = () => ({ date: today(), recipientName: "", recipientIdNumber: "", memberId: "", amount: "", nature: "INCOME_DISTRIBUTION", note: "" });
  const [form, setForm] = useState(blank());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  function close() { setForm(blank()); setErr(null); onClose(); }

  function pickMember(e) {
    const id = e.target.value;
    const m = members.find((x) => String(x.id) === id);
    setForm((f) => ({
      ...f,
      memberId: id,
      recipientName: m ? m.fullName : f.recipientName,
      recipientIdNumber: m ? (m.idNumber || f.recipientIdNumber) : f.recipientIdNumber,
    }));
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api.post("/api/finance/distributions", {
        date: form.date,
        recipientName: form.recipientName,
        recipientIdNumber: form.recipientIdNumber || null,
        memberId: form.memberId || null,
        amount: Number(form.amount),
        nature: form.nature,
        note: form.note || null,
      });
      close();
      onDone();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={close} title="Record a distribution" wide>
      {err && <div className="mb-3"><Alert type="error">{err}</Alert></div>}
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Date (must be in an open period)" required>
          <input className="input" type="date" required value={form.date} onChange={set("date")} />
        </Field>
        <Field label="Amount (R)" required>
          <input className="input" type="number" min="0.01" step="0.01" required value={form.amount} onChange={set("amount")} />
        </Field>
        <Field label="Link to a member (optional)" className="sm:col-span-2">
          <select className="input" value={form.memberId} onChange={pickMember}>
            <option value="">— Not linked / external beneficiary —</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.fullName}{m.idNumber ? ` (${m.idNumber})` : ""}</option>)}
          </select>
        </Field>
        <Field label="Recipient name" required>
          <input className="input" required value={form.recipientName} onChange={set("recipientName")} placeholder="Beneficiary full name" />
        </Field>
        <Field label="Recipient ID number">
          <input className="input" value={form.recipientIdNumber} onChange={set("recipientIdNumber")} placeholder="Required by SARS for IT3(t)" />
        </Field>
        <Field label="Nature">
          <select className="input" value={form.nature} onChange={set("nature")}>
            {NATURES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </select>
        </Field>
        <Field label="Note">
          <input className="input" value={form.note} onChange={set("note")} placeholder="e.g. 2026 income distribution" />
        </Field>
        <div className="sm:col-span-2 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={close}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Recording…" : "Record distribution"}</button>
        </div>
      </form>
    </Modal>
  );
}
