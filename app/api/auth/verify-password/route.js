import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getStaffSession, unauthorized, signConfirmToken } from "@/lib/auth";
import { ok, bad } from "@/lib/api";

export async function POST(req) {
  const session = await getStaffSession();
  if (!session) return unauthorized();
  try {
    const { password } = await req.json();
    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user || !user.isActive) return unauthorized();
    if (!(await bcrypt.compare(password || "", user.password))) {
      return bad("Incorrect password. Please try again.");
    }
    const confirmToken = await signConfirmToken(user.id);
    return ok({ ok: true, confirmToken });
  } catch (e) {
    return bad(e.message);
  }
}
