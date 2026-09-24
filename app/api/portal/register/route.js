import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, setSessionCookie, PORTAL_COOKIE } from "@/lib/auth";
import { ok, bad, created } from "@/lib/api";

// Member self sign-up. Staff confirm the plot allocation afterwards, so a
// self-registered member starts with no plot and no financial history; their
// plot preference is captured as an inquiry for the sales pipeline.
export async function POST(req) {
  try {
    const b = await req.json();
    const fullName = (b.fullName || "").trim();
    const email = (b.email || "").toLowerCase().trim();
    const phone = (b.phone || "").trim();
    const password = b.password || "";

    if (fullName.length < 3) return bad("Your full name is required");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return bad("A valid email address is required");
    if (phone.length < 9) return bad("A contact phone number is required");
    if (password.length < 8) return bad("Password must be at least 8 characters");
    if (!b.acceptedTerms) return bad("You must accept the Terms and Conditions of Sale");

    const existing = await prisma.member.findUnique({ where: { email } });

    let member;
    if (existing) {
      if (existing.password) return bad("An account already exists for this email address. Please sign in.", 409);
      // Staff created this record but the member never activated the portal.
      const idMatches = b.idNumber && existing.idNumber && existing.idNumber === b.idNumber.trim();
      const phoneMatches = existing.phone && existing.phone === phone;
      if (!idMatches && !phoneMatches) {
        return bad("We could not verify your details against our records. Please contact the Trust office.", 403);
      }
      member = await prisma.member.update({
        where: { id: existing.id },
        data: { password: await bcrypt.hash(password, 10), fullName, phone, isActive: true },
      });
    } else {
      member = await prisma.member.create({
        data: {
          fullName,
          email,
          phone,
          password: await bcrypt.hash(password, 10),
          idNumber: (b.idNumber || "").trim() || null,
          paymentPlan: b.paymentPlan || null,
          notes: "Self-registered through the website member portal.",
        },
      });
    }

    if (b.plotNumber) {
      const alreadyAllocated = await prisma.plot.findFirst({ where: { memberId: member.id } });
      const plot = alreadyAllocated ? null : await prisma.plot.findFirst({
        where: { number: String(b.plotNumber).trim(), project: { slug: "river-edge" } },
      });
      if (plot) {
        await prisma.inquiry.create({
          data: {
            name: fullName,
            email,
            phone,
            idNumber: (b.idNumber || "").trim() || null,
            plotId: plot.id,
            message: `Member portal sign-up. Plot preference: erf ${plot.number}.${b.paymentPlan ? ` Payment plan: ${b.paymentPlan}.` : ""}`,
            source: "WEBSITE",
          },
        });
        const team = await prisma.user.findMany({ where: { role: "FINANCE", isActive: true }, select: { id: true } });
        for (const u of team) {
          await prisma.notification.create({
            data: { userId: u.id, text: `New member sign-up: ${fullName} (portal account, erf ${plot.number} preference)`, type: "INQUIRY" },
          });
        }
      }
    }

    const token = await signToken({ scope: "portal", id: member.id, name: member.fullName, email: member.email });
    await setSessionCookie(PORTAL_COOKIE, token);
    return created({ member: { id: member.id, name: member.fullName, email: member.email } });
  } catch (e) {
    return bad(e.message);
  }
}
