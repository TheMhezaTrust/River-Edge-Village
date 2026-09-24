import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, setSessionCookie, PORTAL_COOKIE } from "@/lib/auth";
import { ok, bad } from "@/lib/api";

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    const member = await prisma.member.findUnique({ where: { email: (email || "").toLowerCase().trim() } });
    if (!member || !member.password || !(await bcrypt.compare(password || "", member.password))) {
      return bad("Invalid email or password", 401);
    }
    const token = await signToken({ scope: "portal", id: member.id, name: member.fullName, email: member.email });
    await setSessionCookie(PORTAL_COOKIE, token);
    return ok({ member: { id: member.id, name: member.fullName, email: member.email } });
  } catch (e) {
    return bad(e.message);
  }
}
