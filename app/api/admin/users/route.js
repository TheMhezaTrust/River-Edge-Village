import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { guard, audit, ROLES, SUPER_ADMIN } from "@/lib/auth";
import { ASSIGNABLE_ROLES } from "@/lib/roles";
import { ok, bad, created } from "@/lib/api";

export async function GET() {
  const { error } = await guard("users:view");
  if (error) return error;
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, title: true, phone: true, isActive: true, lastLoginAt: true, createdAt: true },
    orderBy: { name: "asc" },
  });
  // The Main Administrator designation is backend-only, so it is reported to the
  // staff directory as a plain administrator role (label and raw value alike).
  return ok(
    users.map((u) => {
      const role = u.role === SUPER_ADMIN ? "ADMIN" : u.role;
      return { ...u, role, roleLabel: ROLES[role] };
    })
  );
}

export async function POST(req) {
  const { user, error } = await guard("users:manage");
  if (error) return error;
  try {
    const b = await req.json();
    if (!b.name || !b.email || !b.role || !b.password) return bad("Name, email, role and password are required");
    if (!ASSIGNABLE_ROLES[b.role]) return bad("Invalid role");
    if (b.password.length < 8) return bad("Password must be at least 8 characters");
    const newUser = await prisma.user.create({
      data: {
        name: b.name,
        email: b.email.toLowerCase().trim(),
        role: b.role,
        title: b.title || null,
        phone: b.phone || null,
        password: await bcrypt.hash(b.password, 10),
      },
      select: { id: true, name: true, email: true, role: true },
    });
    await audit(user, "USER_CREATED", "User", newUser.id, newUser.email);
    return created(newUser);
  } catch (e) {
    return bad(e.code === "P2002" ? "A user with this email already exists" : e.message);
  }
}
