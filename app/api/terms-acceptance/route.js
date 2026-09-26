import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getAnySession } from "@/lib/auth";
import { ok, bad } from "@/lib/api";

// The TermsAcceptance table is additive and may not exist yet if `prisma db push`
// has not been run against a given environment. Create it on first write so the
// feature works with no manual migration or Vercel step. Idempotent and matches
// Prisma's PostgreSQL mapping for the model (mirrors the SiteContent pattern).
const ENSURE_TABLE = `CREATE TABLE IF NOT EXISTS "TermsAcceptance" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipAddress" TEXT,
  CONSTRAINT "TermsAcceptance_pkey" PRIMARY KEY ("id")
)`;

export async function POST(req) {
  try {
    // A logged-in member/staff user is recorded by their real id; an anonymous
    // visitor falls back to a browser-generated session id sent in the body.
    const session = await getAnySession();
    let anonymousId = null;
    try {
      const b = await req.json();
      if (typeof b?.anonymousId === "string" && b.anonymousId.trim()) {
        anonymousId = b.anonymousId.trim().slice(0, 100);
      }
    } catch {
      // body is optional
    }
    const userId = session?.id != null ? String(session.id) : anonymousId || randomUUID();

    // Best-effort client IP (Vercel populates x-forwarded-for). Optional.
    const xff = req.headers.get("x-forwarded-for");
    const ip = xff ? xff.split(",")[0].trim() : "";
    const ipAddress = ip ? ip.slice(0, 45) : null;

    await prisma.$executeRawUnsafe(ENSURE_TABLE);
    const row = await prisma.termsAcceptance.create({ data: { userId, ipAddress } });
    return ok({ ok: true, id: row.id, acceptedAt: row.acceptedAt });
  } catch (e) {
    return bad(e?.message || "Could not record your acceptance. Please try again.");
  }
}
