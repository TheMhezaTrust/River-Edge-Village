import { prisma } from "@/lib/prisma";
import { ok, bad, created } from "@/lib/api";
import { TRUST } from "@/lib/contact";
import { sendMail } from "@/lib/email";

const KIND_LABELS = {
  CONTACT: "contact form message",
  VIEWING: "site viewing request",
  REGISTER: "interest registration",
  INTEREST: "plot inquiry",
};

const receivedFmt = new Intl.DateTimeFormat("en-ZA", {
  timeZone: "Africa/Johannesburg",
  dateStyle: "medium",
  timeStyle: "short",
});

// The office hears about a submission over email as well as in-app, because the
// shared Trust inbox is what gets read when nobody is logged into the workstation.
async function notifyOffice({ inquiry, kind, name, email, phone, plotLabel, detail }) {
  const what = KIND_LABELS[kind] || "inquiry";
  const lines = [
    `A new ${what} was submitted on ${TRUST.website}.`,
    "",
    `Name: ${name}`,
    `Email: ${email || "-"}`,
    `Phone: ${phone || "-"}`,
    `Plot: ${plotLabel || "-"}`,
    `Received: ${receivedFmt.format(new Date())} SAST`,
  ];
  if (detail) lines.push("", detail);
  lines.push("", `Open it in the workstation: ${TRUST.siteUrl}/workstation/inquiries (inquiry #${inquiry.id})`);

  await sendMail({ to: TRUST.email, subject: `New ${what} from ${name}`, text: lines.join("\n") });
}

// Public form submissions: express interest, contact, register interest, schedule viewing
export async function POST(req) {
  try {
    const b = await req.json();
    const kind = b.kind || "INTEREST";
    if (!b.name) return bad("Your full name is required");
    if (!b.email && !b.phone) return bad("An email address or phone number is required");

    let plotId = null;
    let plotLabel = null;
    if (b.plotId) {
      const plot = await prisma.plot.findUnique({
        where: { id: Number(b.plotId) },
        select: { id: true, number: true, block: true },
      });
      if (plot) {
        plotId = plot.id;
        plotLabel = `Plot ${plot.number}${plot.block ? ` (Block ${plot.block})` : ""}`;
      }
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

    // The visitor's ID/passport stays out of the email on purpose: the submission is
    // already stored against the inquiry, and an identity number should not be copied
    // into a shared mailbox.
    const detail = messageParts.filter((p) => !p.startsWith("ID/Passport:")).join("\n");

    try {
      await notifyOffice({ inquiry, kind, name: b.name, email: b.email, phone: b.phone, plotLabel, detail });
    } catch (e) {
      // A mail provider outage must never cost the Trust the submission: it is saved
      // and the staff notifications above are already written, so the visitor still
      // gets a success response.
      console.error(`[inquiry:${kind}] office notification for #${inquiry.id} failed:`, e?.message || e);
    }

    return created({ ok: true, message: "Thank you for your interest. A consultant will contact you within 24-48 hours." });
  } catch (e) {
    return bad(e.message);
  }
}
