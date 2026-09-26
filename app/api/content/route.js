import { prisma } from "@/lib/prisma";
import { guard, audit, verifyConfirmToken } from "@/lib/auth";
import { ok, bad } from "@/lib/api";
import { CONTENT_FIELDS, getSiteContent } from "@/lib/site-content";

export async function GET() {
  const { error } = await guard("settings:manage");
  if (error) return error;
  const values = await getSiteContent();
  return ok({
    fields: CONTENT_FIELDS.map(({ group, key, label, help, multiline, default: def }) => ({
      group, key, label, help, multiline, default: def,
    })),
    values,
  });
}

export async function PUT(req) {
  const { user, error } = await guard("settings:manage");
  if (error) return error;
  try {
    const b = await req.json();
    if (!(await verifyConfirmToken(b.confirmToken))) {
      return bad("Password confirmation required or expired. Please try again.", 401);
    }
    const allowed = new Set(CONTENT_FIELDS.map((f) => f.key));
    const incoming = b.values || {};
    const changed = [];
    for (const [key, raw] of Object.entries(incoming)) {
      if (!allowed.has(key)) continue;
      const value = String(raw ?? "");
      await prisma.siteContent.upsert({ where: { key }, update: { value }, create: { key, value } });
      changed.push(key);
    }
    await audit(user, "SITE_CONTENT_UPDATED", "SiteContent", null, `${changed.length} field(s): ${changed.join(", ")}`);
    return ok({ ok: true, updated: changed.length, values: await getSiteContent() });
  } catch (e) {
    return bad(e.message);
  }
}
