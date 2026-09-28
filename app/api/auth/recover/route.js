import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signRecoveryToken, verifyRecoveryToken, audit, SUPER_ADMIN } from "@/lib/auth";
import {
  getQuestions,
  checkAnswer,
  lockoutRemaining,
  registerFailure,
  clearFailures,
  LOCKOUT_MINUTES,
} from "@/lib/security-questions";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { ok, bad } from "@/lib/api";

// Two-step recovery for the Main Administrator: identify the account, answer
// question 1, answer question 2, then set a new password. Each correct answer
// exchanges a short-lived stage token for the next one, so a step cannot be
// skipped. Answers are bcrypt-hashed; failures are counted on the
// SecurityQuestion row (durable) and per IP (best effort).

const NOT_AVAILABLE =
  "Self-service recovery is not available for this account. Ask the Trust administrator to reset your password.";

function lockMessage(ms) {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  return `Too many incorrect answers. Recovery is locked for another ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

export async function POST(req) {
  const ip = clientIp(req);
  let body;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid request");
  }
  const step = body?.step;

  const limiter = rateLimit(`recover:${step}:${ip}`, {
    limit: step === "start" ? 8 : 12,
    windowMs: 10 * 60_000,
  });
  if (!limiter.allowed) {
    return bad(`Too many attempts. Please try again in ${limiter.retryAfterSeconds} seconds.`, 429);
  }

  try {
    if (step === "start") return await start(body);
    if (step === "answer1") return await answer(body, "q1", "q2", 1);
    if (step === "answer2") return await answer(body, "q2", "reset", 2);
    if (step === "reset") return await reset(body);
    return bad("Unknown step");
  } catch (e) {
    return bad(e?.message || "Recovery failed. Please try again.");
  }
}

async function start({ email }) {
  const user = await prisma.user.findUnique({
    where: { email: String(email || "").toLowerCase().trim() },
    select: { id: true, isActive: true, role: true },
  });
  // Only the designated Main Administrator with questions on file can recover
  // here; everyone else gets the same generic answer (no account enumeration).
  const row = user?.isActive && user.role === SUPER_ADMIN ? await getQuestions(user.id) : null;
  if (!user || !row) return ok({ available: false, message: NOT_AVAILABLE });

  const locked = lockoutRemaining(row);
  if (locked > 0) return bad(lockMessage(locked), 423);

  await audit({ id: user.id }, "PASSWORD_RECOVERY_STARTED", "User", user.id);
  return ok({ available: true, question: row.question1, token: await signRecoveryToken(user.id, "q1") });
}

async function answer({ token, answer }, fromStage, toStage, questionNumber) {
  const payload = await verifyRecoveryToken(token, fromStage);
  if (!payload) return bad("This recovery session has expired. Please start again.", 401);

  const row = await getQuestions(payload.id);
  if (!row) return bad(NOT_AVAILABLE);

  const locked = lockoutRemaining(row);
  if (locked > 0) return bad(lockMessage(locked), 423);

  const hash = questionNumber === 1 ? row.answer1Hash : row.answer2Hash;
  if (!(await checkAnswer(answer, hash))) {
    const result = await registerFailure(row);
    await audit({ id: payload.id }, "PASSWORD_RECOVERY_FAILED", "User", payload.id, `Question ${questionNumber}`);
    return bad(
      result.locked
        ? lockMessage(LOCKOUT_MINUTES * 60_000)
        : `Incorrect answer. ${result.attemptsLeft} attempt${result.attemptsLeft === 1 ? "" : "s"} left before a temporary lock.`,
      401
    );
  }

  await clearFailures(row);
  const nextToken = await signRecoveryToken(payload.id, toStage);
  return toStage === "q2" ? ok({ question: row.question2, token: nextToken }) : ok({ token: nextToken });
}

async function reset({ token, newPassword }) {
  const payload = await verifyRecoveryToken(token, "reset");
  if (!payload) return bad("This recovery session has expired. Please start again.", 401);

  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user || !user.isActive) return bad("That account is not available");
  if (String(newPassword || "").length < 8) return bad("New password must be at least 8 characters");

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(newPassword, 10) },
  });
  await clearFailures(await getQuestions(user.id));
  await audit({ id: user.id }, "PASSWORD_RECOVERY_COMPLETED", "User", user.id);
  return ok({ ok: true });
}
