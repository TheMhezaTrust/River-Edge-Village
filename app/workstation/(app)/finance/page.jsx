"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/lib/api-client";
import { useFetch, PageHeader, LoadingBlock, ErrorBlock, ConfirmButton } from "@/components/ws/common";
import { usePermissions, ReadOnlyNote } from "@/components/ws/permissions";
import { Modal, Field, Alert, StatCard } from "@/components/ui";
import { zar, zarFull, dateFmt } from "@/lib/format";

const TABS = [
  ["income", "Income"],
  ["expenses", "Expenses"],
  ["payments", "Payments"],
  ["cashflow", "Cash Flow"],
  ["payroll", "Payroll"],
];

const INCOME_CATEGORIES = ["PLOT_SALE", "FEE", "DONATION", "OTHER"];
const EXPENSE_CATEGORIES = ["SALARY", "CONTRACTOR", "SUPPLIES", "FEES", "LEGAL", "MARKETING", "OTHER"];
const METHODS = ["EFT", "CASH", "CARD", "DEBIT_ORDER", "CHEQUE"];

const today = () => new Date().toISOString().slice(0, 10);
const catLabel = (c) => (c || "-").replaceAll("_", " ");

export default function FinancePage() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading finance…" />}>
      <FinanceInner />
    </Suspense>
  );
}

function FinanceInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { can } = usePermissions();
  const canFinance = can("finance:manage");
  const canPayroll = can("payroll:manage");
  const tab = TABS.some(([k]) => k === searchParams.get("tab")) ? searchParams.get("tab") : "income";

  function setTab(t) {
    router.replace(t === "income" ? pathname : `${pathname}?tab=${t}`, { scroll: false });
  }

  return (
    <div>
      <PageHeader title="Financial Management" subtitle="Income, expenses, member payments, cash flow and payroll for The Mheza Trust" />

      {!canFinance && <div className="mb-4"><ReadOnlyNote label="all financial records" /></div>}

      <div className="mb-5 flex flex-wrap gap-1 border-b border-gray-200">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-semibold cursor-pointer border-b-2 -mb-px ${
              tab === k ? "border-forest-700 text-forest-800" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "income" && <IncomeTab canManage={canFinance} />}
      {tab === "expenses" && <ExpensesTab canManage={canFinance} />}
      {tab === "payments" && <PaymentsTab canManage={canFinance} />}
      {tab === "cashflow" && <CashFlowTab />}
      {tab === "payroll" && <PayrollTab canManage={canPayroll} />}
    </div>
  );
}

function IncomeTab({ canManage }) {
  const { data: income, loading, error, reload } = useFetch("/api/finance/income");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ date: today(), description: "", project: "River Edge Rural Village", amount: "", category: "PLOT_SALE", method: "EFT", reference: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const total = (income || []).reduce((s, r) => s + r.amount, 0);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.post("/api/finance/income", form);
      setAddOpen(false);
      setForm({ date: today(), description: "", project: "River Edge Rural Village", amount: "", category: "PLOT_SALE", method: "EFT", reference: "" });
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading && !income) return <LoadingBlock label="Loading income…" />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{income.length} income record(s) · total <strong className="text-forest-700">{zarFull(total)}</strong></p>
        {canManage && <button className="btn-primary btn-sm" onClick={() => setAddOpen(true)}>+ Add Income</button>}
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Date</th><th>Description</th><th>Project</th><th>Category</th><th>Method</th><th>Reference</th><th className="text-right">Amount</th><th></th></tr></thead>
          <tbody>
            {income.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap">{dateFmt(r.date)}</td>
                <td className="font-medium">{r.description}</td>
                <td className="text-xs text-gray-500">{r.project}</td>
                <td className="text-xs">{catLabel(r.category)}</td>
                <td className="text-xs">{r.method || "-"}</td>
                <td className="font-mono text-xs text-gray-500">{r.reference || "-"}</td>
                <td className="text-right font-bold text-forest-700 whitespace-nowrap">{zarFull(r.amount)}</td>
                <td>
                  {canManage && (
                    <ConfirmButton
                      className="btn-ghost btn-sm text-red-600"
                      confirmText={`Delete income "${r.description}" (${zarFull(r.amount)})?`}
                      onConfirm={async () => { await api.del(`/api/finance/income?id=${r.id}`); reload(); }}
                    />
                  )}
                </td>
              </tr>
            ))}
            {income.length === 0 && <tr><td colSpan={8} className="text-center text-gray-500 py-10">No income recorded yet.</td></tr>}
          </tbody>
          {income.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50">
                <td colSpan={6} className="font-bold text-gray-700">Total</td>
                <td className="text-right font-bold text-forest-700 whitespace-nowrap">{zarFull(total)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Income" wide>
        {formError && <div className="mb-4"><Alert type="error">{formError}</Alert></div>}
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Date" required><input className="input" type="date" required value={form.date} onChange={set("date")} /></Field>
          <Field label="Amount (R)" required><input className="input" type="number" min="0.01" step="0.01" required value={form.amount} onChange={set("amount")} /></Field>
          <Field label="Description" required className="sm:col-span-2"><input className="input" required value={form.description} onChange={set("description")} placeholder="e.g. Plot 47 deposit" /></Field>
          <Field label="Project"><input className="input" value={form.project} onChange={set("project")} /></Field>
          <Field label="Category">
            <select className="input" value={form.category} onChange={set("category")}>
              {INCOME_CATEGORIES.map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
            </select>
          </Field>
          <Field label="Method">
            <select className="input" value={form.method} onChange={set("method")}>
              {METHODS.map((m) => <option key={m} value={m}>{catLabel(m)}</option>)}
            </select>
          </Field>
          <Field label="Reference"><input className="input" value={form.reference} onChange={set("reference")} /></Field>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setAddOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Add Income"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function ExpensesTab({ canManage }) {
  const { data: expenses, loading, error, reload } = useFetch("/api/finance/expenses");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ date: today(), description: "", category: "SUPPLIES", amount: "", vendor: "", project: "River Edge Rural Village" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const total = (expenses || []).reduce((s, r) => s + r.amount, 0);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.post("/api/finance/expenses", form);
      setAddOpen(false);
      setForm({ date: today(), description: "", category: "SUPPLIES", amount: "", vendor: "", project: "River Edge Rural Village" });
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading && !expenses) return <LoadingBlock label="Loading expenses…" />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{expenses.length} expense record(s) · total <strong className="text-red-600">{zarFull(total)}</strong></p>
        {canManage && <button className="btn-primary btn-sm" onClick={() => setAddOpen(true)}>+ Add Expense</button>}
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Vendor</th><th>Project</th><th className="text-right">Amount</th><th></th></tr></thead>
          <tbody>
            {expenses.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap">{dateFmt(r.date)}</td>
                <td className="font-medium">{r.description}</td>
                <td className="text-xs">{catLabel(r.category)}</td>
                <td className="text-xs text-gray-600">{r.vendor || "-"}</td>
                <td className="text-xs text-gray-500">{r.project}</td>
                <td className="text-right font-bold text-red-600 whitespace-nowrap">{zarFull(r.amount)}</td>
                <td>
                  {canManage && (
                    <ConfirmButton
                      className="btn-ghost btn-sm text-red-600"
                      confirmText={`Delete expense "${r.description}" (${zarFull(r.amount)})?`}
                      onConfirm={async () => { await api.del(`/api/finance/expenses?id=${r.id}`); reload(); }}
                    />
                  )}
                </td>
              </tr>
            ))}
            {expenses.length === 0 && <tr><td colSpan={7} className="text-center text-gray-500 py-10">No expenses recorded yet.</td></tr>}
          </tbody>
          {expenses.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50">
                <td colSpan={5} className="font-bold text-gray-700">Total</td>
                <td className="text-right font-bold text-red-600 whitespace-nowrap">{zarFull(total)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Expense" wide>
        {formError && <div className="mb-4"><Alert type="error">{formError}</Alert></div>}
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Date" required><input className="input" type="date" required value={form.date} onChange={set("date")} /></Field>
          <Field label="Amount (R)" required><input className="input" type="number" min="0.01" step="0.01" required value={form.amount} onChange={set("amount")} /></Field>
          <Field label="Description" required className="sm:col-span-2"><input className="input" required value={form.description} onChange={set("description")} placeholder="e.g. Site clearing — Block C" /></Field>
          <Field label="Category">
            <select className="input" value={form.category} onChange={set("category")}>
              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
            </select>
          </Field>
          <Field label="Vendor"><input className="input" value={form.vendor} onChange={set("vendor")} /></Field>
          <Field label="Project" className="sm:col-span-2"><input className="input" value={form.project} onChange={set("project")} /></Field>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setAddOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Add Expense"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function PaymentsTab({ canManage }) {
  const { data: rows, loading, error } = useFetch("/api/finance/payments");
  const [expanded, setExpanded] = useState(null);
  const [reminder, setReminder] = useState(null);

  if (loading && !rows) return <LoadingBlock label="Loading payments…" />;
  if (error) return <ErrorBlock message={error} />;

  const totalOutstanding = rows.reduce((s, r) => s + r.outstandingBalance, 0);
  const totalCollected = rows.reduce((s, r) => s + r.totalPaid, 0);

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3 mb-4">
        <StatCard label="Collected" value={zar(totalCollected)} accent="forest" sub={`${rows.length} member(s)`} />
        <StatCard label="Outstanding" value={zar(totalOutstanding)} accent="red" sub="Across all members" />
        <StatCard label="In Arrears" value={rows.filter((r) => r.outstandingBalance > 0).length} accent="amber" sub="Members with a balance" />
      </div>

      {reminder && <div className="mb-4"><Alert type="success" onClose={() => setReminder(null)}>{reminder}</Alert></div>}

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead><tr><th></th><th>Member</th><th>Plot</th><th>Price</th><th>Paid</th><th>Outstanding</th><th>Last Payment</th><th></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <PaymentRow key={r.id} row={r} canManage={canManage} expanded={expanded === r.id} onToggle={() => setExpanded(expanded === r.id ? null : r.id)} onRemind={() => setReminder(`Reminder queued for ${r.fullName} (${r.email}). Email delivery will follow.`)} />
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="text-center text-gray-500 py-10">No members yet.</td></tr>}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50">
                <td colSpan={4} className="font-bold text-gray-700">Totals</td>
                <td className="font-bold text-forest-700 whitespace-nowrap">{zar(totalCollected)}</td>
                <td className="font-bold text-red-600 whitespace-nowrap">{zar(totalOutstanding)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function PaymentRow({ row, canManage, expanded, onToggle, onRemind }) {
  return (
    <>
      <tr>
        <td>
          <button onClick={onToggle} className="btn-ghost btn-sm cursor-pointer" aria-label={expanded ? "Collapse payment history" : "Expand payment history"}>
            {expanded ? "▾" : "▸"}
          </button>
        </td>
        <td>
          <Link href={`/workstation/members/${row.id}`} className="font-semibold text-forest-700 hover:underline">{row.fullName}</Link>
          <p className="text-xs text-gray-500">{row.email} · {row.phone}</p>
        </td>
        <td>{row.plotNumber ? `Plot ${row.plotNumber}` : "-"}</td>
        <td className="whitespace-nowrap">{zar(row.price)}</td>
        <td className="whitespace-nowrap text-forest-700">{zar(row.totalPaid)}</td>
        <td className={`whitespace-nowrap font-semibold ${row.outstandingBalance > 0 ? "text-red-600" : "text-gray-400"}`}>{zar(row.outstandingBalance)}</td>
        <td className="whitespace-nowrap text-xs text-gray-600">{dateFmt(row.lastPaymentDate)}</td>
        <td className="whitespace-nowrap">
          {canManage ? (
            <>
              <Link href={`/workstation/members/${row.id}`} className="btn-outline btn-sm">Record Payment</Link>
              {row.outstandingBalance > 0 && <button className="btn-ghost btn-sm" onClick={onRemind}>Send reminder</button>}
            </>
          ) : (
            <span className="text-xs text-gray-400">View only</span>
          )}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8} className="bg-gray-50 p-0">
            {row.payments.length === 0 ? (
              <p className="px-6 py-4 text-sm text-gray-500">No payments recorded for this member.</p>
            ) : (
              <table className="table-base">
                <thead><tr><th>Date</th><th>Note</th><th>Method</th><th>Reference</th><th className="text-right">Amount</th></tr></thead>
                <tbody>
                  {row.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="whitespace-nowrap">{dateFmt(p.date)}</td>
                      <td>{p.note || "-"}</td>
                      <td>{p.method}</td>
                      <td className="font-mono text-xs text-gray-500">{p.reference || "-"}</td>
                      <td className="text-right font-bold text-forest-700 whitespace-nowrap">{zarFull(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function CashFlowTab() {
  const { data, loading, error } = useFetch("/api/finance/cashflow");

  if (loading && !data) return <LoadingBlock label="Loading cash flow…" />;
  if (error) return <ErrorBlock message={error} />;

  const { months, totals } = data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Income" value={zar(totals.totalIncome)} accent="forest" sub="All time" />
        <StatCard label="Total Expenses" value={zar(totals.totalExpenses)} accent="red" sub="All time" />
        <StatCard label="Net Profit" value={zar(totals.profit)} accent={totals.profit >= 0 ? "forest" : "red"} sub="Income − expenses" />
        <StatCard label="Income This Month" value={zar(totals.incomeThisMonth)} accent="trust" sub={months[months.length - 1]?.label} />
        <StatCard label="Expenses This Month" value={zar(totals.expenseThisMonth)} accent="amber" sub={months[months.length - 1]?.label} />
      </div>

      <div className="card p-6">
        <h2 className="font-bold text-gray-900 mb-4">Inflow vs Outflow (last 12 months)</h2>
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <BarChart data={months} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v) => `R${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v) => zarFull(v)} />
              <Legend />
              <Bar dataKey="inflow" name="Inflow" fill="#2d6a4f" radius={[4, 4, 0, 0]} />
              <Bar dataKey="outflow" name="Outflow" fill="#e05252" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-900">Monthly Closing Balances</h2>
        </div>
        <table className="table-base">
          <thead><tr><th>Month</th><th className="text-right">Inflow</th><th className="text-right">Outflow</th><th className="text-right">Net</th><th className="text-right">Closing Balance</th></tr></thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.key}>
                <td className="font-medium">{m.label}</td>
                <td className="text-right text-forest-700 whitespace-nowrap">{zar(m.inflow)}</td>
                <td className="text-right text-red-600 whitespace-nowrap">{zar(m.outflow)}</td>
                <td className={`text-right font-semibold whitespace-nowrap ${m.net >= 0 ? "text-forest-700" : "text-red-600"}`}>{zar(m.net)}</td>
                <td className="text-right font-bold whitespace-nowrap">{zar(m.closingBalance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PayrollTab({ canManage }) {
  const { data: employees, loading, error, reload } = useFetch("/api/finance/payroll");
  const [addOpen, setAddOpen] = useState(false);
  const [slipFor, setSlipFor] = useState(null);
  const [form, setForm] = useState({ name: "", jobTitle: "", salary: "", paye: "", uif: "", sdl: "", startDate: today() });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.post("/api/finance/payroll", form);
      setAddOpen(false);
      setForm({ name: "", jobTitle: "", salary: "", paye: "", uif: "", sdl: "", startDate: today() });
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading && !employees) return <LoadingBlock label="Loading payroll…" />;
  if (error) return <ErrorBlock message={error} />;

  const monthlyCost = employees.reduce((s, e) => s + e.employerCost, 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{employees.length} employee(s) · monthly employer cost <strong className="text-forest-700">{zarFull(monthlyCost)}</strong></p>
        {canManage && <button className="btn-primary btn-sm" onClick={() => setAddOpen(true)}>+ Add Employee</button>}
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Name</th><th>Job Title</th><th>Start Date</th><th className="text-right">Gross Salary</th><th className="text-right">PAYE</th><th className="text-right">UIF</th><th className="text-right">SDL</th><th className="text-right">Net Pay</th><th className="text-right">Employer Cost</th><th></th></tr></thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id}>
                <td className="font-semibold">{e.name}</td>
                <td className="text-xs text-gray-600">{e.jobTitle}</td>
                <td className="whitespace-nowrap text-xs">{dateFmt(e.startDate)}</td>
                <td className="text-right whitespace-nowrap">{zar(e.salary)}</td>
                <td className="text-right whitespace-nowrap text-red-600">{zar(e.paye)}</td>
                <td className="text-right whitespace-nowrap text-red-600">{zar(e.uif)}</td>
                <td className="text-right whitespace-nowrap text-red-600">{zar(e.sdl)}</td>
                <td className="text-right font-bold text-forest-700 whitespace-nowrap">{zar(e.netPay)}</td>
                <td className="text-right whitespace-nowrap">{zar(e.employerCost)}</td>
                <td className="whitespace-nowrap">
                  <button className="btn-outline btn-sm" onClick={() => setSlipFor(e)}>Payslip</button>
                  {canManage && (
                    <ConfirmButton
                      className="btn-ghost btn-sm text-red-600"
                      confirmText={`Remove ${e.name} from payroll?`}
                      onConfirm={async () => { await api.del(`/api/finance/payroll?id=${e.id}`); reload(); }}
                    />
                  )}
                </td>
              </tr>
            ))}
            {employees.length === 0 && <tr><td colSpan={10} className="text-center text-gray-500 py-10">No employees on payroll yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Employee" wide>
        {formError && <div className="mb-4"><Alert type="error">{formError}</Alert></div>}
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Full Name" required><input className="input" required value={form.name} onChange={set("name")} /></Field>
          <Field label="Job Title" required><input className="input" required value={form.jobTitle} onChange={set("jobTitle")} /></Field>
          <Field label="Monthly Gross Salary (R)" required><input className="input" type="number" min="0" step="0.01" required value={form.salary} onChange={set("salary")} /></Field>
          <Field label="Start Date"><input className="input" type="date" value={form.startDate} onChange={set("startDate")} /></Field>
          <Field label="PAYE (R/month)"><input className="input" type="number" min="0" step="0.01" value={form.paye} onChange={set("paye")} placeholder="0" /></Field>
          <Field label="UIF — employee 1% (R/month)"><input className="input" type="number" min="0" step="0.01" value={form.uif} onChange={set("uif")} placeholder="0" /></Field>
          <Field label="SDL (R/month)"><input className="input" type="number" min="0" step="0.01" value={form.sdl} onChange={set("sdl")} placeholder="0" /></Field>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setAddOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Add Employee"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!slipFor} onClose={() => setSlipFor(null)} title={slipFor ? `Payslip — ${slipFor.name}` : ""}>
        {slipFor && (
          <div>
            <div id="payslip" className="rounded-lg border border-gray-200 p-6 bg-white">
              <div className="text-center border-b border-gray-200 pb-4 mb-4">
                <p className="font-bold text-lg text-forest-900">THE MHEZA TRUST</p>
                <p className="text-xs text-gray-500">River Edge Rural Village · Monthly Payslip</p>
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-gray-500">Employee</dt><dd className="font-semibold">{slipFor.name}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Position</dt><dd>{slipFor.jobTitle}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Start Date</dt><dd>{dateFmt(slipFor.startDate)}</dd></div>
              </dl>
              <div className="mt-4 border-t border-gray-200 pt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Gross Salary</span><span className="font-medium">{zarFull(slipFor.salary)}</span></div>
                <div className="flex justify-between text-red-600"><span>PAYE</span><span>− {zarFull(slipFor.paye)}</span></div>
                <div className="flex justify-between text-red-600"><span>UIF (1%)</span><span>− {zarFull(slipFor.uif)}</span></div>
                <div className="flex justify-between text-red-600"><span>SDL</span><span>− {zarFull(slipFor.sdl)}</span></div>
                <div className="flex justify-between border-t-2 border-gray-300 pt-3 text-base font-bold text-forest-800">
                  <span>NET PAY</span><span>{zarFull(slipFor.netPay)}</span>
                </div>
              </div>
              <p className="mt-4 text-xs text-gray-400 text-center">Generated {dateFmt(new Date())} · The Mheza Trust payroll system</p>
            </div>
            <div className="flex justify-end gap-2 mt-4 print:hidden">
              <button className="btn-ghost" onClick={() => setSlipFor(null)}>Close</button>
              <button className="btn-primary" onClick={() => window.print()}>Print Payslip</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
