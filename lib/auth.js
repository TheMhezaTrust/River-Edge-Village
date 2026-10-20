import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { createHmac } from "crypto";

export const STAFF_COOKIE = "mheza_staff";
export const PORTAL_COOKIE = "mheza_portal";

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET || "mheza-dev-secret");

import { ROLES, ROLE_PERMISSIONS, can, SUPER_ADMIN, isAdminRole } from "./roles.js";
export { ROLES, ROLE_PERMISSIONS, can, SUPER_ADMIN, isAdminRole };

export async function signToken(payload, expiresIn = "12h") {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret());
}

// Members are held to a 15-minute inactivity window, so their token is short-lived
// and re-issued by the portal heartbeat while they are actually using the site.
// Staff keep the 12-hour session.
export const PORTAL_SESSION_SECONDS = 15 * 60;
export const PORTAL_SESSION_TTL = "15m";

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload;
  } catch {
    return null;
  }
}

// Short-lived proof that the logged-in staff user re-entered their password for
// a sensitive action (create member, update public site content). The mutating
// route re-checks this so the confirmation cannot be skipped on the client.
export async function signConfirmToken(userId) {
  return new SignJWT({ scope: "confirm", id: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(secret());
}

export async function verifyConfirmToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload?.scope === "confirm" ? payload : null;
  } catch {
    return null;
  }
}

// Staged proof of progress through the security-question recovery flow. Each
// stage token only unlocks the next step, so an attacker cannot skip straight
// to the password reset without answering both questions.
export async function signRecoveryToken(userId, stage) {
  return new SignJWT({ scope: `recovery:${stage}`, id: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secret());
}

export async function verifyRecoveryToken(token, stage) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload?.scope === `recovery:${stage}` ? payload : null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(name, token, maxAge = 60 * 60 * 12) {
  const store = await cookies();
  store.set(name, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge });
}

// Signs and stores a member session. Called on login and again by the heartbeat,
// which is what makes the 15-minute window an *inactivity* window rather than a
// hard limit on how long someone may stay signed in.
export async function startPortalSession(member) {
  const token = await signToken(
    { scope: "portal", id: member.id, name: member.fullName, email: member.email },
    PORTAL_SESSION_TTL,
  );
  await setSessionCookie(PORTAL_COOKIE, token, PORTAL_SESSION_SECONDS);
  return token;
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

// True only for a logged-in staff user whose role is an administrator role
// (ADMIN or the backend-only SUPER_ADMIN). Members (portal) and non-admin staff
// are excluded — used to gate the /plots route family and the "Available Plots"
// nav/footer tab, which are administrator-only.
export function isStaffAdmin(session) {
  return !!session && session.scope === "staff" && isAdminRole(session.role);
}

// The Main Administrator only. The role is read from the database rather than
// the JWT: a session signed before the designation still carries the old role,
// and a role change must take effect (or be revoked) immediately.
export async function getSuperAdminSession() {
  const session = await getStaffSession();
  if (!session) return null;
  const { prisma } = await import("./prisma.js");
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
  if (!user || !user.isActive || user.role !== SUPER_ADMIN) return null;
  return { ...session, role: user.role, name: user.name, email: user.email };
}

// A JWT stays valid until it expires, so a member can be deleted or deactivated
// while their cookie still verifies. Pages that redirect on "has session" must use
// these instead, or a stale cookie sends them into a redirect loop. Identity and
// name are read from the database rather than trusted from the token.
export async function getActivePortalMember() {
  const session = await getPortalSession();
  if (!session) return null;
  const { prisma } = await import("./prisma.js");
  const member = await prisma.member.findUnique({
    where: { id: session.id },
    select: { id: true, fullName: true, email: true, isActive: true, mustChangePassword: true },
  });
  if (!member || !member.isActive) return null;
  return member;
}

export async function getActivePortalSession() {
  const member = await getActivePortalMember();
  if (!member) return null;
  return { scope: "portal", id: member.id, name: member.fullName, email: member.email };
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

export async function audit(user, action, entity, entityId, details, oldValue, newValue) {
  const { prisma } = await import("./prisma.js");
  const { ensureAuditTrailColumns } = await import("./provision.js");
  try {
    // The before/after and hash-chain columns are additive; make sure they exist
    // before writing them. Memoised, so this is a no-op after the first call.
    await ensureAuditTrailColumns();

    const detailsStr = details ? (typeof details === "string" ? details : JSON.stringify(details)) : null;
    const oldStr = oldValue == null ? null : typeof oldValue === "string" ? oldValue : JSON.stringify(oldValue);
    const newStr = newValue == null ? null : typeof newValue === "string" ? newValue : JSON.stringify(newValue);
    const userId = user?.id ?? null;
    const entId = entityId != null ? String(entityId) : null;
    const createdAt = new Date();

    // Tamper-evident chain: each row hashes its own contents together with the
    // previous row's hash, so altering, reordering or silently inserting an entry
    // breaks the chain and shows up when the log is verified. Keyed with JWT_SECRET
    // so a reader of the database cannot recompute a valid chain after editing a row.
    // Concurrent writes can fork the chain (the read-then-write is not atomic); the
    // verification endpoint reports a fork as "concurrent write or tampering". This
    // detects alteration — it cannot stop a DB superuser deleting rows outright.
    const last = await prisma.auditLog.findFirst({ orderBy: { id: "desc" }, select: { entryHash: true } });
    const prevHash = last?.entryHash || "GENESIS";
    const entryHash = hashEntry(prevHash, userId, action, entity, entId, detailsStr, oldStr, newStr, createdAt);

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId: entId,
        details: detailsStr,
        oldValue: oldStr,
        newValue: newStr,
        prevHash,
        entryHash,
        createdAt,
      },
    });
  } catch {
    // audit failures must never break the request
  }
}

function hashEntry(prevHash, userId, action, entity, entityId, details, oldValue, newValue, createdAt) {
  const { createHmac } = require("crypto");
  const key = process.env.JWT_SECRET || "mheza-dev-secret";
  const payload = [
    prevHash,
    userId ?? "",
    action ?? "",
    entity ?? "",
    entityId ?? "",
    details ?? "",
    oldValue ?? "",
    newValue ?? "",
    createdAt.toISOString(),
  ].join("|");
  return createHmac("sha256", key).update(payload).digest("hex");
}

// Recompute a row's hash so the verification endpoint can check the chain without
// duplicating the field order used when it was written.
export function computeAuditHash(row) {
  return hashEntry(
    row.prevHash,
    row.userId,
    row.action,
    row.entity,
    row.entityId,
    row.details,
    row.oldValue,
    row.newValue,
    new Date(row.createdAt),
  );
}

