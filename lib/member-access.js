// Member portal access. A member's password is set by the member, through a
// single-use emailed link; the office can also issue a temporary password as a
// fallback for members who cannot receive email. Only a SHA-256 hash of a link
// token is ever stored, so reading the table cannot be turned into a login.
import crypto from "node:crypto";
import { prisma } from "./prisma.js";
import { TRUST } from "./contact.js";
import { sendMail } from "./email.js";
import { ensureMemberAccessTables } from "./provision.js";

const TOKEN_TTL_MINUTES = 30;

// Ambiguous characters are left out: a temporary password gets read off a staff
// screen and typed into a phone, sometimes over the telephone.
const PASSWORD_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

export const hashToken = (token) => crypto.createHash("sha256").update(String(token)).digest("hex");

export const accessLink = (token) => `${TRUST.siteUrl}/portal/access?token=${token}`;

export function generateTempPassword(length = 12) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const bytes = crypto.randomBytes(length);
    const password = Array.from(bytes, (b) => PASSWORD_ALPHABET[b % PASSWORD_ALPHABET.length]).join("");
    if (/[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password)) return password;
  }
  throw new Error("Could not generate a temporary password");
}

function emailFor(member, purpose, link) {
  const firstName = member.fullName.split(" ")[0];
  if (purpose === "RESET") {
    return {
      subject: "Reset your River Edge member portal password",
      text: [
        `Dear ${firstName},`,
        "",
        "We received a request to reset your member portal password. Use the link below within 30 minutes — it can only be used once:",
        "",
        link,
        "",
        "If you did not ask for this, ignore the email and your password will stay the same.",
        "",
        `The Mheza Trust · ${TRUST.primaryPhone} · ${TRUST.email}`,
      ].join("\n"),
    };
  }
  return {
    subject: "Your River Edge member portal is ready",
    text: [
      `Dear ${firstName},`,
      "",
      "Your member portal for River Edge Rural Village is ready. Set your password using the link below within 30 minutes — it can only be used once:",
      "",
      link,
      "",
      "Once you are signed in you can see your plot details, your payment history and statement, and message the Trust directly.",
      "",
      `If you were not expecting this email, please forward it to ${TRUST.email} so we can check the address we hold for you.`,
      "",
      `The Mheza Trust · ${TRUST.primaryPhone} · ${TRUST.email}`,
    ].join("\n"),
  };
}

// Issues a link and emails it. Throws with the provider's own message if the
// email does not go out, and removes the token first: a valid link that nobody
// received would sit in the database until it expired.
export async function sendMemberAccessLink({ member, purpose, createdById }) {
  await ensureMemberAccessTables();
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000);

  const row = await prisma.memberToken.create({
    data: { memberId: member.id, tokenHash: hashToken(token), purpose, expiresAt, createdById: createdById ?? null },
  });

  try {
    await sendMail({ to: member.email, ...emailFor(member, purpose, accessLink(token)) });
  } catch (e) {
    await prisma.memberToken.delete({ where: { id: row.id } }).catch(() => {});
    throw e;
  }
  return { expiresAt };
}

export async function readMemberToken(token) {
  await ensureMemberAccessTables();
  if (!token) return null;
  const row = await prisma.memberToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { member: { select: { id: true, fullName: true, email: true, isActive: true } } },
  });
  if (!row || row.usedAt || row.expiresAt < new Date() || !row.member?.isActive) return null;
  return row;
}

export async function consumeMemberToken(id) {
  await prisma.memberToken.update({ where: { id }, data: { usedAt: new Date() } }).catch(() => {});
}
