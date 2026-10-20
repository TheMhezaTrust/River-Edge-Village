import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, bad } from "@/lib/api";
import { seedLedger, transferBetweenJars } from "@/lib/ledger";

// Move available funds from one jar to another. This is the escape hatch the delete
// safeguard points at: to remove a jar that still holds money, transfer its balance
// out first. The movement is written as an auditable ADJUSTMENT transaction.
export async function POST(req) {
  const { user, error } = await guard("finance:admin");
  if (error) return error;
  try {
    await seedLedger();
    const b = await req.json();
    const fromId = Number(b.fromId);
    const toId = Number(b.toId);
    const amount = Number(b.amount);
    if (!fromId || !toId) return bad("Choose both a source and a destination category.");
    if (!Number.isFinite(amount) || amount <= 0) return bad("A positive amount is required.");

    const txn = await prisma.$transaction((tx) =>
      transferBetweenJars(tx, { fromId, toId, amount, createdById: user.id }),
    );
    await audit(user, "BUDGET_TRANSFER", "Transaction", txn.id, { fromId, toId, amount }, null, { fromId, toId, amount });
    return ok({ ok: true, txnNo: txn.txnNo });
  } catch (e) {
    if (e.code === "INSUFFICIENT_FUNDS") return bad("Insufficient funds in this category.");
    return bad(e.message);
  }
}
