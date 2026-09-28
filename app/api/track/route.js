import { recordPageView } from "@/lib/analytics";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Fire-and-forget beacon from the public site. Always answers 204 and never
// throws: analytics must not be able to break a page for a visitor. The path
// allow-list lives in lib/analytics.js, so internal and unknown routes are
// dropped here.
export async function POST(req) {
  try {
    const ip = clientIp(req);
    const limiter = rateLimit(`track:${ip}`, { limit: 120, windowMs: 60_000 });
    if (limiter.allowed) {
      const body = await req.json().catch(() => null);
      await recordPageView(typeof body?.path === "string" ? body.path : "", ip);
    }
  } catch {
    // a failed page view is not worth an error response
  }
  return new Response(null, { status: 204 });
}
