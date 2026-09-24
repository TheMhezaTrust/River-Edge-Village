import { clearSessionCookie, PORTAL_COOKIE } from "@/lib/auth";
import { ok } from "@/lib/api";

export async function POST() {
  await clearSessionCookie(PORTAL_COOKIE);
  return ok({ ok: true });
}
