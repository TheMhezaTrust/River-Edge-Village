import bcrypt from "bcryptjs";
import { prisma } from "./prisma.js";
import { ensureSecurityQuestionTable } from "./provision.js";

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 30;

// Compared case- and spacing-insensitively so the administrator is not locked
// out of their own account by a capital letter.
export function normalizeAnswer(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function hashAnswer(value) {
  return bcrypt.hash(normalizeAnswer(value), 10);
}

export function checkAnswer(value, hash) {
  return bcrypt.compare(normalizeAnswer(value), hash || "");
}

export async function getQuestions(userId) {
  await ensureSecurityQuestionTable();
  return prisma.securityQuestion.findUnique({ where: { userId } });
}

export async function saveQuestions(userId, { question1, answer1, question2, answer2 }) {
  await ensureSecurityQuestionTable();
  const [answer1Hash, answer2Hash] = await Promise.all([hashAnswer(answer1), hashAnswer(answer2)]);
  return prisma.securityQuestion.upsert({
    where: { userId },
    create: { userId, question1, answer1Hash, question2, answer2Hash },
    update: { question1, answer1Hash, question2, answer2Hash, failedAttempts: 0, lockedUntil: null },
  });
}

// Milliseconds left on an active lockout (0 = not locked).
export function lockoutRemaining(row) {
  if (!row?.lockedUntil) return 0;
  return Math.max(0, new Date(row.lockedUntil).getTime() - Date.now());
}

export async function registerFailure(row) {
  const failedAttempts = (row.failedAttempts || 0) + 1;
  const locked = failedAttempts >= MAX_FAILED_ATTEMPTS;
  await prisma.securityQuestion.update({
    where: { id: row.id },
    data: {
      failedAttempts: locked ? 0 : failedAttempts,
      lockedUntil: locked ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : null,
    },
  });
  return { locked, attemptsLeft: locked ? 0 : MAX_FAILED_ATTEMPTS - failedAttempts };
}

export async function clearFailures(row) {
  if (!row || (!row.failedAttempts && !row.lockedUntil)) return;
  await prisma.securityQuestion.update({
    where: { id: row.id },
    data: { failedAttempts: 0, lockedUntil: null },
  });
}
