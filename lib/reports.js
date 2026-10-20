import { prisma } from "./prisma.js";
import { ensureLedgerTables } from "./provision.js";
import { seedLedger, CHART_OF_ACCOUNTS } from "./ledger.js";

// The formal financial statements. Everything here is derived from committed journal
// lines — nothing is estimated or invented. Reports share one envelope so the UI can
// render any of them generically and build a CSV from the same column/row data:
//   { report, title, from, to, columns:[{key,label,align}], rows:[{...}], totals:{...}|null }
// Amounts follow the natural-balance sign convention of each statement, so a figure is
// always shown as a positive number in the column it belongs to.

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const BANK_CODE = "1000";

// 'YYYY-MM-DD' → UTC bounds, matching how operational rows store their date
// (new Date('YYYY-MM-DD') is UTC midnight), so range filters line up.
const startOf = (d) => (d ? new Date(`${d}T00:00:00.000Z`) : null);
const endOf = (d) => (d ? new Date(`${d}T23:59:59.999Z`) : null);

// One fetch feeds every report: all journal lines up to `to` (cumulative, so the
// Balance Sheet and Trial Balance can be built as-at a date), each carrying its
// transaction header. Period reports then filter by `from` in memory.
export async function loadLedger({ from = null, to = null } = {}) {
  await ensureLedgerTables();
  await seedLedger();
  const accounts = await prisma.account.findMany({ orderBy: { code: "asc" } });
  const toBound = endOf(to);
  const lines = await prisma.journalLine.findMany({
    where: toBound ? { transaction: { date: { lte: toBound } } } : {},
    include: { transaction: { select: { id: true, txnNo: true, date: true, description: true, type: true } } },
    orderBy: [{ transaction: { date: "asc" } }, { id: "asc" }],
  });
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const fromBound = startOf(from);
  const inPeriod = (l) => (fromBound ? new Date(l.transaction.date) >= fromBound : true);
  const beforePeriod = (l) => (fromBound ? new Date(l.transaction.date) < fromBound : false);
  return { accounts, accountById, lines, periodLines: lines.filter(inPeriod), openingLines: lines.filter(beforePeriod), from, to };
}

const accountType = (accountById, line) => accountById.get(line.accountId)?.type;

// ---------------------------------------------------------------------------
// Trial Balance — every account's cumulative debit and credit as at `to`. The two
// totals must agree; if they do not, the ledger is corrupt and the report says so.
// ---------------------------------------------------------------------------
export function trialBalance(ledger) {
  const { accounts, lines } = ledger;
  const sums = new Map(accounts.map((a) => [a.id, { debit: 0, credit: 0 }]));
  for (const l of lines) {
    const s = sums.get(l.accountId);
    if (!s) continue;
    s.debit += l.debit || 0;
    s.credit += l.credit || 0;
  }
  const rows = [];
  let totalDebit = 0;
  let totalCredit = 0;
  for (const a of accounts) {
    const s = sums.get(a.id);
    if (!s || (round2(s.debit) === 0 && round2(s.credit) === 0)) continue;
    totalDebit += s.debit;
    totalCredit += s.credit;
    rows.push({ code: a.code, account: a.name, type: a.type, debit: round2(s.debit) || "", credit: round2(s.credit) || "" });
  }
  return {
    report: "trialBalance",
    title: "Trial Balance",
    columns: [
      { key: "code", label: "Code", align: "left" },
      { key: "account", label: "Account", align: "left" },
      { key: "type", label: "Type", align: "left" },
      { key: "debit", label: "Debit", align: "right", money: true },
      { key: "credit", label: "Credit", align: "right", money: true },
    ],
    rows,
    totals: { debit: round2(totalDebit), credit: round2(totalCredit) },
    balanced: Math.abs(round2(totalDebit) - round2(totalCredit)) < 0.01,
  };
}

// ---------------------------------------------------------------------------
// General Ledger — every journal line in the period, grouped by account, with a
// running balance per account that opens on the cumulative balance before `from`.
// ---------------------------------------------------------------------------
export function generalLedger(ledger) {
  const { accounts, periodLines, openingLines } = ledger;
  const byAccount = new Map(accounts.map((a) => [a.id, a]));
  const opening = new Map();
  for (const l of openingLines) opening.set(l.accountId, (opening.get(l.accountId) || 0) + (l.debit || 0) - (l.credit || 0));

  const grouped = new Map();
  for (const l of periodLines) {
    if (!grouped.has(l.accountId)) grouped.set(l.accountId, []);
    grouped.get(l.accountId).push(l);
  }

  const rows = [];
  const orderedAccounts = accounts.filter((a) => grouped.has(a.id));
  for (const a of orderedAccounts) {
    let balance = round2(opening.get(a.id) || 0);
    rows.push({ _section: true, code: a.code, account: a.name, date: "", txn: "", description: `Opening balance`, debit: "", credit: "", balance });
    for (const l of grouped.get(a.id)) {
      balance = round2(balance + (l.debit || 0) - (l.credit || 0));
      rows.push({
        code: a.code,
        account: a.name,
        date: new Date(l.transaction.date).toISOString().slice(0, 10),
        txn: l.transaction.txnNo,
        description: l.memo || l.transaction.description,
        debit: round2(l.debit) || "",
        credit: round2(l.credit) || "",
        balance,
      });
    }
  }
  return {
    report: "generalLedger",
    title: "General Ledger",
    columns: [
      { key: "date", label: "Date", align: "left" },
      { key: "txn", label: "Txn", align: "left" },
      { key: "code", label: "Code", align: "left" },
      { key: "account", label: "Account", align: "left" },
      { key: "description", label: "Description", align: "left" },
      { key: "debit", label: "Debit", align: "right", money: true },
      { key: "credit", label: "Credit", align: "right", money: true },
      { key: "balance", label: "Balance", align: "right", money: true },
    ],
    rows,
    totals: null,
  };
}

// ---------------------------------------------------------------------------
// Income Statement (P&L) — revenue and expense movement within the period.
// ---------------------------------------------------------------------------
export function incomeStatement(ledger) {
  const { accounts, periodLines } = ledger;
  const net = new Map(accounts.map((a) => [a.id, 0]));
  for (const l of periodLines) {
    const t = accountType(ledger.accountById, l);
    if (t !== "REVENUE" && t !== "EXPENSE") continue;
    // Revenue is a credit balance, expense a debit balance; store each as positive.
    net.set(l.accountId, (net.get(l.accountId) || 0) + (t === "REVENUE" ? (l.credit || 0) - (l.debit || 0) : (l.debit || 0) - (l.credit || 0)));
  }
  const rows = [];
  let totalRevenue = 0;
  let totalExpense = 0;
  for (const type of ["REVENUE", "EXPENSE"]) {
    rows.push({ _section: true, label: type === "REVENUE" ? "Revenue" : "Expenses", amount: "" });
    let subtotal = 0;
    for (const a of accounts.filter((x) => x.type === type)) {
      const v = round2(net.get(a.id) || 0);
      if (v === 0) continue;
      subtotal += v;
      rows.push({ label: `  ${a.code} — ${a.name}`, amount: v });
    }
    if (subtotal === 0) rows.push({ label: "  (none)", amount: "" });
    rows.push({ _bold: true, label: type === "REVENUE" ? "Total revenue" : "Total expenses", amount: round2(subtotal) });
    if (type === "REVENUE") totalRevenue = round2(subtotal);
    else totalExpense = round2(subtotal);
  }
  const netProfit = round2(totalRevenue - totalExpense);
  rows.push({ _bold: true, _total: true, label: netProfit >= 0 ? "Net surplus" : "Net deficit", amount: netProfit });
  return {
    report: "incomeStatement",
    title: "Income Statement (P&L)",
    columns: [
      { key: "label", label: "", align: "left" },
      { key: "amount", label: "Amount", align: "right", money: true },
    ],
    rows,
    totals: { revenue: totalRevenue, expense: totalExpense, net: netProfit },
  };
}

// ---------------------------------------------------------------------------
// Balance Sheet — cumulative position as at `to`. Net income for the period to date
// is folded into equity so that Assets = Liabilities + Equity holds.
// ---------------------------------------------------------------------------
export function balanceSheet(ledger) {
  const { accounts, lines } = ledger;
  const net = new Map(accounts.map((a) => [a.id, 0]));
  for (const l of lines) net.set(l.accountId, (net.get(l.accountId) || 0) + (l.debit || 0) - (l.credit || 0));
  const bal = (id, type) => {
    const v = round2(net.get(id) || 0);
    return type === "ASSET" || type === "EXPENSE" ? v : -v; // credit-balance accounts stored as debit−credit
  };

  const rows = [];
  const section = (title, type) => {
    rows.push({ _section: true, label: title, amount: "" });
    let subtotal = 0;
    for (const a of accounts.filter((x) => x.type === type)) {
      const v = round2(bal(a.id, type));
      if (v === 0) continue;
      subtotal += v;
      rows.push({ label: `  ${a.code} — ${a.name}`, amount: v });
    }
    if (subtotal === 0) rows.push({ label: "  (none)", amount: "" });
    rows.push({ _bold: true, label: `Total ${title.toLowerCase()}`, amount: round2(subtotal) });
    return round2(subtotal);
  };

  const totalAssets = section("Assets", "ASSET");
  const totalLiabilities = section("Liabilities", "LIABILITY");
  const totalEquity = section("Equity", "EQUITY");

  let revenue = 0;
  let expense = 0;
  for (const a of accounts) {
    if (a.type === "REVENUE") revenue += -round2(net.get(a.id) || 0);
    if (a.type === "EXPENSE") expense += round2(net.get(a.id) || 0);
  }
  const netIncome = round2(revenue - expense);
  rows.push({ label: "  Net income for the period", amount: netIncome });
  rows.push({ _bold: true, label: "Total equity & retained income", amount: round2(totalEquity + netIncome) });

  const totalLiabEquity = round2(totalLiabilities + totalEquity + netIncome);
  rows.push({ _bold: true, _total: true, label: "Total liabilities & equity", amount: totalLiabEquity });

  return {
    report: "balanceSheet",
    title: "Balance Sheet",
    columns: [
      { key: "label", label: "", align: "left" },
      { key: "amount", label: "Amount", align: "right", money: true },
    ],
    rows,
    totals: { assets: totalAssets, liabilitiesEquity: totalLiabEquity },
    balanced: Math.abs(totalAssets - totalLiabEquity) < 0.01,
  };
}

// ---------------------------------------------------------------------------
// Cash Flow — direct method, derived from movements in the bank account within the
// period, classified by the transaction type that moved the cash.
// ---------------------------------------------------------------------------
export function cashFlow(ledger) {
  const { accounts, periodLines, openingLines, accountById } = ledger;
  const bank = accounts.find((a) => a.code === BANK_CODE);
  if (!bank) return { report: "cashFlow", title: "Cash Flow", columns: [], rows: [], totals: null };
  const bankId = bank.id;

  const openingCash = round2(openingLines.filter((l) => l.accountId === bankId).reduce((s, l) => s + (l.debit || 0) - (l.credit || 0), 0));

  const buckets = {
    operatingIn: 0,
    operatingOut: 0,
    financingOut: 0,
    investing: 0,
    other: 0,
  };
  for (const l of periodLines) {
    if (l.accountId !== bankId) continue;
    const movement = (l.debit || 0) - (l.credit || 0); // +cash in, −cash out
    const type = l.transaction.type;
    if (type === "INCOME") buckets.operatingIn += movement;
    else if (type === "EXPENSE") buckets.operatingOut += movement;
    else if (type === "DISTRIBUTION") buckets.financingOut += movement;
    else if (type === "OPENING") buckets.other += movement;
    else buckets.other += movement;
  }

  const rows = [
    { _section: true, label: "Operating activities", amount: "" },
    { label: "  Cash received from members & other income", amount: round2(buckets.operatingIn) },
    { label: "  Cash paid for expenses", amount: round2(buckets.operatingOut) },
    { _bold: true, label: "Net cash from operating activities", amount: round2(buckets.operatingIn + buckets.operatingOut) },
    { _section: true, label: "Financing activities", amount: "" },
    { label: "  Distributions to beneficiaries", amount: round2(buckets.financingOut) },
    { _bold: true, label: "Net cash from financing activities", amount: round2(buckets.financingOut) },
  ];
  if (round2(buckets.other) !== 0) {
    rows.push({ _section: true, label: "Other movements", amount: "" });
    rows.push({ label: "  Adjustments & opening entries", amount: round2(buckets.other) });
  }
  const netMovement = round2(buckets.operatingIn + buckets.operatingOut + buckets.financingOut + buckets.other);
  const closingCash = round2(openingCash + netMovement);
  rows.push({ _bold: true, label: "Net increase / (decrease) in cash", amount: netMovement });
  rows.push({ label: "Cash at start of period", amount: openingCash });
  rows.push({ _bold: true, _total: true, label: "Cash at end of period", amount: closingCash });

  return {
    report: "cashFlow",
    title: "Cash Flow Statement",
    columns: [
      { key: "label", label: "", align: "left" },
      { key: "amount", label: "Amount", align: "right", money: true },
    ],
    rows,
    totals: { openingCash, closingCash, netMovement },
  };
}

// ---------------------------------------------------------------------------
// Accountant export — one flat, clean CSV of every journal line in the period, in
// the column order Sage / Xero / QuickBooks manual-journal imports expect.
// ---------------------------------------------------------------------------
export function accountantExport(ledger) {
  const { periodLines, accountById } = ledger;
  const rows = periodLines.map((l) => {
    const a = accountById.get(l.accountId);
    return {
      date: new Date(l.transaction.date).toISOString().slice(0, 10),
      txn: l.transaction.txnNo,
      type: l.transaction.type,
      description: l.transaction.description,
      accountCode: a?.code || "",
      accountName: a?.name || "",
      debit: round2(l.debit) || "",
      credit: round2(l.credit) || "",
      memo: l.memo || "",
    };
  });
  return {
    report: "accountant",
    title: "Accountant Export (journal lines)",
    columns: [
      { key: "date", label: "Date", align: "left" },
      { key: "txn", label: "Transaction ID", align: "left" },
      { key: "type", label: "Type", align: "left" },
      { key: "description", label: "Description", align: "left" },
      { key: "accountCode", label: "Account Code", align: "left" },
      { key: "accountName", label: "Account Name", align: "left" },
      { key: "debit", label: "Debit", align: "right", money: true },
      { key: "credit", label: "Credit", align: "right", money: true },
      { key: "memo", label: "Memo", align: "left" },
    ],
    rows,
    totals: null,
  };
}

export const REPORT_BUILDERS = {
  generalLedger,
  trialBalance,
  incomeStatement,
  balanceSheet,
  cashFlow,
  accountant: accountantExport,
};

export { CHART_OF_ACCOUNTS };
