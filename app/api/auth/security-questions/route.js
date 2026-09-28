import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSuperAdminSession, audit, forbidden } from "@/lib/auth";
import { getQuestions, saveQuestions, normalizeAnswer } from "@/lib/security-questions";
import { ok, bad } from "@/lib/api";

// Security questions exist for the Main Administrator only, and the question
// text is never returned here: the settings screen shows only whether recovery
// is configured. The text is revealed solely inside /workstation/recover.

export async function GET() {
  const session = await getSuperAdminSession();
  if (!session) return forbidden();
  try {
    const row = await getQuestions(session.id);
    return ok({ configured: !!row, updatedAt: row?.updatedAt ?? null });
  } catch (e) {
    return bad(e?.message || "Could not load your recovery settings");
  }
}

export async function PUT(req) {
  const session = await getSuperAdminSession();
  if (!session) return forbidden();
  try {
    const b = await req.json();
    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user || !(await bcrypt.compare(b.currentPassword || "", user.password))) {
      return bad("Your current password is incorrect", 401);
    }

    const question1 = String(b.question1 || "").trim();
    const question2 = String(b.question2 || "").trim();
    const answer1 = normalizeAnswer(b.answer1);
    const answer2 = normalizeAnswer(b.answer2);

    if (question1.length < 5 || question2.length < 5) return bad("Each question must be at least 5 characters");
    if (question1.length > 200 || question2.length > 200) return bad("Questions must be 200 characters or fewer");
    if (question1.toLowerCase() === question2.toLowerCase()) return bad("The two questions must be different");
    if (answer1.length < 3 || answer2.length < 3) return bad("Each answer must be at least 3 characters");
    if (answer1.length > 200 || answer2.length > 200) return bad("Answers must be 200 characters or fewer");
    if (answer1 === answer2) return bad("The two answers must be different");

    const row = await saveQuestions(session.id, { question1, answer1, question2, answer2 });
    await audit(session, "SECURITY_QUESTIONS_UPDATED", "User", session.id);
    return ok({ ok: true, configured: true, updatedAt: row.updatedAt });
  } catch (e) {
    return bad(e?.message || "Could not save your recovery questions");
  }
}
