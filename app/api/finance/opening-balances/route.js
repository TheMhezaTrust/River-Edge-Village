import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, bad } from "@/lib/api";
import { ensureLedgerTables } from "@/lib/provision";
import { ledgerReady, createLedgerTransaction, assertPeriodOpen } from "@/lib/ledger";

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Opening balances are keyed by a Finance Admin from the Trust's real books — nothing
// is estimated here. The whole sheet posts as one balanced OPENING transaction so the
// Balance Sheet can be built purely from journal lines, and re-keying a date replaces
// that date's opening entry (only while its period is still open).
export async function GET(req) {
  const { error } = await guard("finance:view");
  if (error) return error;
  await ensureLedgerTables();
  const accountList = await ledgerReady(); // seeds the chart, returns code→id
  const accounts = await prisma.account.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true, name: true, type: true } });
  const balances = await prisma.openingBalance.findMany({ orderBy: { asAt: "desc" } });
  return ok({ accounts, balances, seededAccounts: accountList.size });
}

export async function POST(req) {
  const { user, error } = await guard("finance:admin");
  if (error) return error;
  try {
    const b = await req.json();
    if (!b.asAt) return bad("An 'as at' date is required.");
    const asAt = new Date(b.asAt);
    if (Number.isNaN(asAt.getTime())) return bad("A valid 'as at' date is required.");
    const entries = Array.isArray(b.entries) ? b.entries : [];

    const accountIds = await ledgerReady();
    const lines = [];
    for (const e of entries) {
      const accountId = accountIds.get(String(e.accountCode));
      if (!accountId) continue;
      const debit = round2(Number(e.debit) || 0);
      const credit = round2(Number(e.credit) || 0);
      if (debit === 0 && credit === 0) continue;
      if (debit < 0 || credit < 0) return bad("Opening balances cannot be negative.");
      lines.push({ accountId, debit, credit, memo: e.note ? String(e.note).trim() : null });
    }
    if (lines.length === 0) return bad("Enter at least one non-zero opening balance.");
    const totalDebit = round2(lines.reduce((s, l) => s + l.debit, 0));
    const totalCredit = round2(lines.reduce((s, l) => s + l.credit, 0));
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return bad(`The opening sheet must balance: debits ${totalDebit} ≠ credits ${totalCredit}.`);
    }
    await assertPeriodOpen(asAt);

    const result = await prisma.$transaction(async (tx) => {
      // Replace any opening sheet already keyed for this exact date.
      const existing = await tx.openingBalance.findMany({ where: { asAt } });
      const txnIds = [...new Set(existing.map((e) => e.transactionId).filter(Boolean))];
      if (existing.length) await tx.openingBalance.deleteMany({ where: { asAt } });
      for (const id of txnIds) await tx.transaction.delete({ where: { id } }).catch(() => {});

      const txn = await createLedgerTransaction(tx, {
        type: "OPENING",
        date: asAt,
        description: `Opening balances as at ${asAt.toISOString().slice(0, 10)}`,
        amount: totalDebit,
        sourceType: "OPENING",
        createdById: user.id,
        lines,
      });

      for (const l of lines) {
        await tx.openingBalance.create({
          data: { accountId: l.accountId, asAt, debit: l.debit, credit: l.credit, note: l.memo, transactionId: txn.id, createdById: user.id },
        });
      }
      return txn;
    });

    await audit(user, "OPENING_BALANCES_POSTED", "Transaction", result.id, { asAt: b.asAt, totalDebit, accounts: lines.length }, null, { txnNo: result.txnNo });
    return ok({ ok: true, txnNo: result.txnNo, totalDebit, lines: lines.length });
  } catch (e) {
    if (e.code === "PERIOD_LOCKED") return bad(e.message, 409);
    return bad(e.message);
  }
}
