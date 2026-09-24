import { prisma } from "@/lib/prisma";
import { ok, bad, created } from "@/lib/api";

// Public form submissions: express interest, contact, register interest, schedule viewing
export async function POST(req) {
  try {
    const b = await req.json();
    const kind = b.kind || "INTEREST";
    if (!b.name) return bad("Your full name is required");
    if (!b.email && !b.phone) return bad("An email address or phone number is required");

    let plotId = null;
    if (b.plotId) {
      const plot = await prisma.plot.findUnique({ where: { id: Number(b.plotId) } });
      plotId = plot?.id ?? null;
    }

    const messageParts = [];
    if (b.subject) messageParts.push(`Subject: ${b.subject}`);
    if (b.message) messageParts.push(b.message);
    if (b.idNumber) messageParts.push(`ID/Passport: ${b.idNumber}`);
    if (kind === "VIEWING") messageParts.push(`Site viewing requested for ${b.date || "a date to be arranged"} with ${b.attendees || 1} attendee(s).`);
    if (b.plotPreference) messageParts.push(`Plot preference: ${b.plotPreference}`);
    if (kind === "REGISTER") messageParts.push("Newsletter / interest registration from the website.");

    const inquiry = await prisma.inquiry.create({
      data: {
        name: b.name,
        email: (b.email || "").toLowerCase().trim(),
        phone: b.phone || "",
        idNumber: b.idNumber || null,
        plotId,
        message: messageParts.join(" | ") || null,
        source: kind === "VIEWING" ? "WALK_IN" : "WEBSITE",
      },
    });

    const customerTeam = await prisma.user.findMany({ where: { role: "FINANCE", isActive: true }, select: { id: true } });
    for (const u of customerTeam) {
      await prisma.notification.create({ data: { userId: u.id, text: `New ${kind === "VIEWING" ? "viewing request" : "inquiry"} from ${b.name}${plotId ? ` (plot interest)` : ""}`, type: "INQUIRY" } });
    }

    // In production this is where an email to themhezatrust@gmail.com would be sent (SendGrid/Mailgun).
    console.log(`[inquiry:${kind}] ${b.name} <${b.email}> ${b.phone} plot=${plotId ?? "-"} -> logged as inquiry #${inquiry.id}`);

    return created({ ok: true, message: "Thank you for your interest. A consultant will contact you within 24-48 hours." });
  } catch (e) {
    return bad(e.message);
  }
}
