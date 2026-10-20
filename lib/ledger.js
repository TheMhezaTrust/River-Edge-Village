import { randomUUID } from "crypto";
import { prisma } from "./prisma.js";
import { ensureLedgerTables } from "./provision.js";

// The formal bookkeeping layer. Income and Expense stay the operational records
// staff already use; everything here posts them into a double-entry ledger that the
// SARS-facing reports (General Ledger, Trial Balance, P&L, Balance Sheet) are built
// from. Nothing is invented: the chart of accounts is a standard Trust structure, and
// the money figures always come from a real Income/Expense row.

// ---------------------------------------------------------------------------
// Chart of accounts. Seeded once, marked isSystem so they can be renamed or
// deactivated but never deleted — historical journal lines point at them.
// ---------------------------------------------------------------------------
export const CHART_OF_ACCOUNTS = [
  { code: "1000", name: "Bank — current account", type: "ASSET", sortOrder: 10 },
  { code: "1200", name: "Members receivable", type: "ASSET", sortOrder: 20 },
  { code: "1500", name: "Land & improvements", type: "ASSET", sortOrder: 30 },
  { code: "2000", name: "Member prepayments (deferred income)", type: "LIABILITY", sortOrder: 40 },
  { code: "2100", name: "VAT payable", type: "LIABILITY", sortOrder: 50 },
  { code: "2200", name: "PAYE / UIF / SDL payable", type: "LIABILITY", sortOrder: 60 },
  { code: "2900", name: "Accounts payable", type: "LIABILITY", sortOrder: 70 },
  { code: "3000", name: "Trust capital", type: "EQUITY", sortOrder: 80 },
  { code: "3100", name: "Retained earnings", type: "EQUITY", sortOrder: 90 },
  { code: "4100", name: "Plot sales revenue", type: "REVENUE", sortOrder: 100 },
  { code: "4200", name: "Fees & admin income", type: "REVENUE", sortOrder: 110 },
  { code: "4300", name: "Donations received", type: "REVENUE", sortOrder: 120 },
  { code: "4900", name: "Other income", type: "REVENUE", sortOrder: 130 },
  { code: "4950", name: "Interest received", type: "REVENUE", sortOrder: 140 },
  { code: "5100", name: "Salaries & wages", type: "EXPENSE", sortOrder: 150 },
  { code: "5150", name: "Payroll taxes (PAYE/UIF/SDL)", type: "EXPENSE", sortOrder: 160 },
  { code: "5200", name: "Rezoning & compliance", type: "EXPENSE", sortOrder: 170 },
  { code: "5300", name: "Eskom & utilities", type: "EXPENSE", sortOrder: 180 },
  { code: "5400", name: "Security", type: "EXPENSE", sortOrder: 190 },
  { code: "5500", name: "Tools & maintenance", type: "EXPENSE", sortOrder: 200 },
  { code: "5600", name: "Contractor & professional fees", type: "EXPENSE", sortOrder: 210 },
  { code: "5700", name: "Legal fees", type: "EXPENSE", sortOrder: 220 },
  { code: "5800", name: "Marketing", type: "EXPENSE", sortOrder: 230 },
  { code: "5900", name: "Bank charges", type: "EXPENSE", sortOrder: 240 },
  { code: "5950", name: "Sundry expenses", type: "EXPENSE", sortOrder: 250 },
];

const BANK_CODE = "1000";

// Operational category → ledger account. Any unrecognised value falls back to the
// "other" account for its side so a posting never fails on an unexpected category.
const INCOME_ACCOUNT_BY_CATEGORY = {
  PLOT_SALE: "4100",
  FEE: "4200",
  DONATION: "4300",
  INTEREST: "4950",
  OTHER: "4900",
};
const INCOME_ACCOUNT_DEFAULT = "4900";

const EXPENSE_ACCOUNT_BY_CATEGORY = {
  SALARY: "5100",
  PAYROLL_TAX: "5150",
  REZONING: "5200",
  UTILITIES: "5300",
  SECURITY: "5400",
  MAINTENANCE: "5500",
  CONTRACTOR: "5600",
  FEES: "5600",
  LEGAL: "5700",
  MARKETING: "5800",
  BANK: "5900",
  SUPPLIES: "5950",
  OTHER: "5950",
};
const EXPENSE_ACCOUNT_DEFAULT = "5950";

// The budget "jars". Percentages here are seeded placeholders — the Trust's real
// allocation policy is the Finance Admin's to set — and the UI flags them as such
// until they are edited. They always total 100.
export const DEFAULT_JARS = [
  { name: "Salaries", percentage: 30, sortOrder: 10 },
  { name: "Rezoning & Compliance", percentage: 25, sortOrder: 20 },
  { name: "Eskom & Utilities", percentage: 15, sortOrder: 30 },
  { name: "Security", percentage: 10, sortOrder: 40 },
  { name: "Tools & Maintenance", percentage: 10, sortOrder: 50 },
  { name: "Emergency Fund", percentage: 10, sortOrder: 60 },
];

const TXN_PREFIX = {
  INCOME: "INC",
  EXPENSE: "EXP",
  ADJUSTMENT: "ADJ",
  OPENING: "OPN",
  DISTRIBUTION: "DIS",
};

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// ---------------------------------------------------------------------------
// Period helpers
// ---------------------------------------------------------------------------
export const monthKeyFor = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
export const yearKeyFor = (date) => `${new Date(date).getFullYear()}`;

// A month is locked when either its own month period or the enclosing year period
// has been closed. Both keys are checked so closing a year locks every month in it.
export async function isPeriodLocked(date) {
  const keys = [monthKeyFor(date), yearKeyFor(date)];
  const closed = await prisma.financialPeriod.findFirst({
    where: { periodKey: { in: keys }, status: "CLOSED" },
    select: { periodKey: true },
  });
  return closed ? closed.periodKey : null;
}

export async function assertPeriodOpen(date) {
  const locked = await isPeriodLocked(date);
  if (locked) {
    const err = new Error(
      `The accounting period ${locked} is closed. Corrections must be posted as an adjustment dated in an open period.`,
    );
    err.code = "PERIOD_LOCKED";
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Seeding — idempotent, memoised per server instance so it does not re-upsert the
// whole chart on every request.
// ---------------------------------------------------------------------------
let seedPromise = null;

export async function seedLedger() {
  if (!seedPromise) {
    seedPromise = (async () => {
      await ensureLedgerTables();
      for (const a of CHART_OF_ACCOUNTS) {
        await prisma.account.upsert({
          where: { code: a.code },
          update: { name: a.name, type: a.type, sortOrder: a.sortOrder },
          create: { ...a, isSystem: true, isActive: true },
        });
      }
      for (const j of DEFAULT_JARS) {
        // Jars are user-manageable, so an existing one is left untouched — only a
        // missing default is created. Renames and percentage edits are the Admin's.
        const existing = await prisma.budgetCategory.findUnique({ where: { name: j.name } });
        if (!existing) await prisma.budgetCategory.create({ data: { ...j, isSystem: false, isActive: true } });
      }
    })().catch((e) => {
      seedPromise = null;
      throw e;
    });
  }
  return seedPromise;
}

// Convenience for routes: make sure the tables exist and the chart is seeded, then
// hand back a code→id map for building journal lines.
export async function ledgerReady() {
  await seedLedger();
  const accounts = await prisma.account.findMany({ select: { id: true, code: true } });
  return new Map(accounts.map((a) => [a.code, a.id]));
}

// ---------------------------------------------------------------------------
// Transaction creation. `tx` is a Prisma transaction client (or prisma itself).
// Lines must balance (sum debit === sum credit) or the posting is rejected — a
// lopsided entry would corrupt every report derived from the ledger.
// ---------------------------------------------------------------------------
export async function createLedgerTransaction(tx, opts) {
  const {
    type,
    date,
    description,
    amount,
    sourceType = null,
    sourceId = null,
    createdById = null,
    reversesId = null,
    vatApplicable = false,
    vatRate = 0,
    vatAmount = 0,
    lines,
  } = opts;

  if (!Array.isArray(lines) || lines.length === 0) throw new Error("A transaction needs at least one journal line.");
  const totalDebit = round2(lines.reduce((s, l) => s + (l.debit || 0), 0));
  const totalCredit = round2(lines.reduce((s, l) => s + (l.credit || 0), 0));
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Unbalanced entry: debits ${totalDebit} != credits ${totalCredit}.`);
  }

  const periodKey = monthKeyFor(date);
  const prefix = TXN_PREFIX[type] || "TXN";

  // txnNo is NOT NULL + unique, but the human-readable number is derived from the
  // serial id, which is only known after insert. Create with a throwaway unique
  // value, then rewrite it from the id — all inside the caller's transaction, so a
  // concurrent reader never sees the placeholder committed.
  const created = await tx.transaction.create({
    data: {
      txnNo: `TMP-${randomUUID()}`,
      type,
      date: new Date(date),
      description,
      amount: round2(amount),
      periodKey,
      sourceType,
      sourceId,
      createdById,
      reversesId,
      vatApplicable,
      vatRate,
      vatAmount,
      lines: { create: lines },
    },
  });

  const txnNo = `${prefix}-${String(created.id).padStart(6, "0")}`;
  return tx.transaction.update({ where: { id: created.id }, data: { txnNo } });
}

// ---------------------------------------------------------------------------
// Posting operational rows into the ledger
// ---------------------------------------------------------------------------
export async function postIncome(tx, income, accountIds, createdById = null) {
  const revenueId = accountIds.get(INCOME_ACCOUNT_BY_CATEGORY[income.category] || INCOME_ACCOUNT_DEFAULT);
  const bankId = accountIds.get(BANK_CODE);
  return createLedgerTransaction(tx, {
    type: "INCOME",
    date: income.date,
    description: income.description,
    amount: income.amount,
    sourceType: "INCOME",
    sourceId: income.id,
    createdById,
    lines: [
      { accountId: bankId, debit: round2(income.amount), credit: 0, memo: income.reference || null },
      { accountId: revenueId, debit: 0, credit: round2(income.amount), memo: income.category },
    ],
  });
}

export async function postExpense(tx, expense, accountIds, { createdById = null, budgetCategoryId = null } = {}) {
  const expenseId = accountIds.get(EXPENSE_ACCOUNT_BY_CATEGORY[expense.category] || EXPENSE_ACCOUNT_DEFAULT);
  const bankId = accountIds.get(BANK_CODE);
  return createLedgerTransaction(tx, {
    type: "EXPENSE",
    date: expense.date,
    description: expense.description,
    amount: expense.amount,
    sourceType: "EXPENSE",
    sourceId: expense.id,
    createdById,
    lines: [
      { accountId: expenseId, debit: round2(expense.amount), credit: 0, memo: expense.category, budgetCategoryId },
      { accountId: bankId, debit: 0, credit: round2(expense.amount), memo: expense.vendor || null },
    ],
  });
}

// ---------------------------------------------------------------------------
// The split engine. Snapshots the *current* active jar percentages onto Allocation
// rows for one incoming payment. Because each allocation stores the percentage that
// was in force when the money arrived, a later percentage change never rewrites
// history — exactly the "future payments only" rule. Rounding drift is pushed onto
// the last jar so the parts still total the payment.
// ---------------------------------------------------------------------------
export async function splitIntoJars(tx, transactionId, amount) {
  const jars = await tx.budgetCategory.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  const active = jars.filter((j) => j.percentage > 0);
  if (active.length === 0) return [];
  const totalPct = active.reduce((s, j) => s + j.percentage, 0);

  let allocated = 0;
  const rows = active.map((j, i) => {
    const isLast = i === active.length - 1;
    const amt = isLast ? round2(amount - allocated) : round2((amount * j.percentage) / totalPct);
    allocated = round2(allocated + amt);
    return {
      transactionId,
      budgetCategoryId: j.id,
      percentage: j.percentage,
      amount: amt,
    };
  });
  await tx.allocation.createMany({ data: rows });
  return rows;
}

// ---------------------------------------------------------------------------
// Idempotent backfill of every existing Income and Expense row into the ledger.
// Without this the reports would silently omit all recorded history (146 members'
// payments). Jars are deliberately NOT split for historical income: the percentages
// in force when that money arrived are unknown, and applying today's would invent
// policy. Jars accumulate from the first payment recorded after go-live.
// ---------------------------------------------------------------------------
export async function backfillLedger() {
  const accountIds = await ledgerReady();

  const [incomes, expenses, existing] = await Promise.all([
    prisma.income.findMany({ orderBy: { date: "asc" } }),
    prisma.expense.findMany({ orderBy: { date: "asc" } }),
    prisma.transaction.findMany({
      where: { sourceType: { in: ["INCOME", "EXPENSE"] } },
      select: { sourceType: true, sourceId: true },
    }),
  ]);

  const seen = new Set(existing.map((t) => `${t.sourceType}:${t.sourceId}`));
  const newIncomes = incomes.filter((i) => !seen.has(`INCOME:${i.id}`));
  const newExpenses = expenses.filter((e) => !seen.has(`EXPENSE:${e.id}`));

  if (newIncomes.length === 0 && newExpenses.length === 0) {
    return { incomes: 0, expenses: 0, skipped: existing.length };
  }

  await prisma.$transaction(async (tx) => {
    for (const income of newIncomes) await postIncome(tx, income, accountIds);
    for (const expense of newExpenses) await postExpense(tx, expense, accountIds);
  });

  return { incomes: newIncomes.length, expenses: newExpenses.length, skipped: existing.length };
}
