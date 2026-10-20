import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, bad, created } from "@/lib/api";
import { ledgerReady, createLedgerTransaction, assertPeriodOpen } from "@/lib/ledger";

// Adjustments are the correction path for a closed period. A locked transaction can
// never be edited or deleted, so a fix is posted as a NEW balanced entry — dated in
// an open period — optionally pointing back at the one it corrects. Both rows stay
// in the books, which is exactly what an auditor expects to see.
export async function GET() {
  const { error } = await guard("finance:view");
  if (error) return error;
  const adjustments = await prisma.transaction.findMany({
    where: { type: "ADJUSTMENT" },
    include: { lines: { include: { account: { select: { code: true, name: true } } } } },
    orderBy: { date: "desc" },
    take: 200,
  });
  return ok(adjustments);
}

export async function POST(req) {
  const { user, error } = await guard("finance:admin");
  if (error) return error;
  try {
    const b = await req.json();
    const date = b.date ? new Date(b.date) : new Date();
    if (Number.isNaN(date.getTime())) return bad("A valid date is required.");
    const description = String(b.description || "").trim();
    if (!description) return bad("A description is required.");
    // The adjustment must land in an OPEN period — posting it into the closed one it
    // corrects would defeat the lock.
    await assertPeriodOpen(date);

    const rawLines = Array.isArray(b.lines) ? b.lines : [];
    if (rawLines.length < 2) return bad("An adjustment needs at least two lines (a debit and a credit).");

    const accountIds = await ledgerReady();
    const lines = [];
    for (const l of rawLines) {
      const accountId = accountIds.get(String(l.accountCode || "").trim());
      if (!accountId) return bad(`Unknown account code "${l.accountCode}".`);
      const debit = Number(l.debit) || 0;
      const credit = Number(l.credit) || 0;
      if (debit < 0 || credit < 0) return bad("Line amounts cannot be negative.");
      if (debit === 0 && credit === 0) return bad("Each line needs a debit or a credit.");
      lines.push({ accountId, debit, credit, memo: l.memo ? String(l.memo) : null });
    }

    const amount = Math.round(lines.reduce((s, l) => s + l.debit, 0) * 100) / 100;
    const reversesId = b.reversesId ? Number(b.reversesId) : null;

    const txn = await prisma.$transaction((tx) =>
      createLedgerTransaction(tx, {
        type: "ADJUSTMENT",
        date,
        description,
        amount,
        reversesId,
        createdById: user.id,
        lines,
      }),
    );

    await audit(user, "ADJUSTMENT_POSTED", "Transaction", txn.id, { description, amount, reversesId }, null, { txnNo: txn.txnNo, description, amount });
    return created(txn);
  } catch (e) {
    if (e.code === "PERIOD_LOCKED") return bad(e.message, 409);
    return bad(e.message);
  }
}
