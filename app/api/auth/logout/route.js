import { clearSessionCookie, STAFF_COOKIE } from "@/lib/auth";
import { ok } from "@/lib/api";

export async function POST() {
  await clearSessionCookie(STAFF_COOKIE);
  return ok({ ok: true });
}
