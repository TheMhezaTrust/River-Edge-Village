import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const STAFF_COOKIE = "mheza_staff";
export const PORTAL_COOKIE = "mheza_portal";

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET || "mheza-dev-secret");

import { ROLES, ROLE_PERMISSIONS, can } from "./roles.js";
export { ROLES, ROLE_PERMISSIONS, can };

export async function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(name, token) {
  const store = await cookies();
  store.set(name, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 });
}

export async function clearSessionCookie(name) {
  const store = await cookies();
  store.delete(name);
}

// For API route handlers: returns staff session or null
export async function getStaffSession() {
  const store = await cookies();
  const token = store.get(STAFF_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.scope !== "staff") return null;
  return payload;
}

export async function getPortalSession() {
  const store = await cookies();
  const token = store.get(PORTAL_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.scope !== "portal") return null;
  return payload;
}

// Any authenticated visitor to the public site: a logged-in member (portal)
// or a logged-in staff user. Used to gate public-facing content that should be
// hidden from anonymous browsers (e.g. the /plots tab and route).
export async function getAnySession() {
  const staff = await getStaffSession();
  if (staff) return { scope: "staff", ...staff };
  const portal = await getPortalSession();
  if (portal) return { scope: "portal", ...portal };
  return null;
}

// A JWT stays valid for 12h, so a member can be deleted or deactivated while
// their cookie still verifies. Pages that redirect on "has session" must use
// this instead, or a stale cookie sends them into a redirect loop.
export async function getActivePortalSession() {
  const session = await getPortalSession();
  if (!session) return null;
  const { prisma } = await import("./prisma.js");
  const member = await prisma.member.findUnique({
    where: { id: session.id },
    select: { id: true, isActive: true },
  });
  if (!member || !member.isActive) return null;
  return session;
}

import { NextResponse } from "next/server";

export const unauthorized = () => NextResponse.json({ error: "Authentication required" }, { status: 401 });
export const forbidden = () => NextResponse.json({ error: "You do not have permission to perform this action" }, { status: 403 });

// Guard helper for route handlers
export async function guard(permission) {
  const user = await getStaffSession();
  if (!user) return { user: null, error: unauthorized() };
  if (permission && !can(user, permission)) return { user, error: forbidden() };
  return { user, error: null };
}

export async function audit(user, action, entity, entityId, details) {
  const { prisma } = await import("./prisma.js");
  try {
    await prisma.auditLog.create({
      data: {
        userId: user?.id ?? null,
        action,
        entity,
        entityId: entityId != null ? String(entityId) : null,
        details: details ? (typeof details === "string" ? details : JSON.stringify(details)) : null,
      },
    });
  } catch {
    // audit failures must never break the request
  }
}
