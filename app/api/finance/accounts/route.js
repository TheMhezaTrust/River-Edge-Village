import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/auth";
import { ok } from "@/lib/api";
import { seedLedger } from "@/lib/ledger";

// The chart of accounts. Every transaction posts into these, and the adjustment form
// and the formal reports both need the list. Seeded on first read so the codes exist
// even before any payment has been recorded.
export async function GET() {
  const { error } = await guard("finance:view");
  if (error) return error;
  await seedLedger();
  const accounts = await prisma.account.findMany({ orderBy: { code: "asc" } });
  return ok(accounts);
}
