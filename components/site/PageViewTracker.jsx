"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Not public marketing pages: the member portal, the sign-in screens and the
// administrator-only plot browser. The server allow-list in lib/analytics.js is
// the real gate — this just avoids pointless requests.
const SKIP = ["/portal", "/login", "/plots", "/workstation", "/api"];

export default function PageViewTracker() {
  const pathname = usePathname();
  const lastSent = useRef(null);

  useEffect(() => {
    if (!pathname || lastSent.current === pathname) return;
    if (SKIP.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return;
    lastSent.current = pathname;
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
