import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const STAFF_COOKIE = "mheza_staff";
const VIEW963_OWNER = "VIEW963_OWNER";

// The software owner's role audits the Trust's records and writes only to its own
// module. Nearly every write route already refuses it through guard() in lib/auth.js,
// because the role holds no :manage permission at all. This catches the rest — the
// handful of routes that were never permission-gated (sending an internal message,
// marking a notification read) — in one place, so "purely auditing" cannot be
// defeated by a new route forgetting its guard.
//
// Kept standalone on purpose: middleware runs on the Edge, and lib/auth.js pulls in
// Node's crypto and next/headers.
function isOwnerWrite(pathname) {
  return pathname === "/api/ads" || pathname.startsWith("/api/ads/");
}

function isOwnSession(pathname) {
  return pathname.startsWith("/api/auth/");
}

// The assistant and the page-view beacon belong to the public website, not to the
// Trust's records. Blocking them would only break the owner's own browsing.
function isPublicTelemetry(pathname) {
  return pathname === "/api/chat" || pathname === "/api/track";
}

export async function middleware(req) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return NextResponse.next();
  }

  const token = req.cookies.get(STAFF_COOKIE)?.value;
  if (!token) return NextResponse.next();

  let role = null;
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET || "mheza-dev-secret"),
    );
    if (payload.scope !== "staff") return NextResponse.next();
    role = payload.role;
  } catch {
    // An unreadable token is the route handler's problem, not this middleware's.
    return NextResponse.next();
  }

  if (role !== VIEW963_OWNER) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (isOwnerWrite(pathname) || isOwnSession(pathname) || isPublicTelemetry(pathname)) return NextResponse.next();

  return NextResponse.json(
    { error: "Your role can audit every module but cannot change Trust records." },
    { status: 403 },
  );
}

export const config = { matcher: ["/api/:path*"] };
