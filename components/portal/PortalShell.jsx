"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import {
  HomeIcon,
  UserIcon,
  UsersIcon,
  MapPinIcon,
  ReceiptIcon,
  LogOutIcon,
  MenuIcon,
} from "./Icons";

const NAV = [
  { href: "/portal/dashboard", label: "Dashboard", Icon: HomeIcon },
  { href: "/portal/profile", label: "My Profile", Icon: UserIcon },
  { href: "/portal/beneficiaries", label: "My Beneficiaries", Icon: UsersIcon },
  { href: "/portal/plot", label: "My Plot Details", Icon: MapPinIcon },
  { href: "/portal/payments", label: "Payments & Statement", Icon: ReceiptIcon },
];

const IDLE_LIMIT_MS = 15 * 60_000;
const WARN_MS = 60_000;
const HEARTBEAT_MS = 4 * 60_000;
const TICK_MS = 10_000;
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"];

export default function PortalShell({ member, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const lastActivity = useRef(Date.now());
  const leaving = useRef(false);

  const leave = useCallback(
    (reason) => {
      if (leaving.current) return;
      leaving.current = true;
      api.post("/api/portal/logout").catch(() => {});
      router.replace(reason ? `/portal?reason=${reason}` : "/portal");
      router.refresh();
    },
    [router],
  );

  // The member's token only lives 15 minutes, so this beat is what keeps an
  // active member signed in. It is skipped while the tab is hidden or while the
  // member has been idle longer than the beat interval — a background tab must
  // not defeat the inactivity timeout. "Stay signed in" passes force, because by
  // then they have usually been idle longer than the interval.
  const beat = useCallback(async (force = false) => {
    if (!force && document.visibilityState !== "visible") return;
    if (!force && Date.now() - lastActivity.current > HEARTBEAT_MS) return;
    try {
      const res = await api.post("/api/portal/heartbeat");
      lastActivity.current = Date.now();
      if (res.mustChangePassword) router.replace("/portal/password");
    } catch (err) {
      if (err.status === 401) leave("expired");
    }
  }, [leave, router]);

  useEffect(() => {
    const touch = () => { lastActivity.current = Date.now(); };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    return () => ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, touch));
  }, []);

  useEffect(() => {
    const beatTimer = setInterval(beat, HEARTBEAT_MS);
    const tickTimer = setInterval(() => {
      const idle = Date.now() - lastActivity.current;
      if (idle >= IDLE_LIMIT_MS) return leave("timeout");
      setSecondsLeft(idle >= IDLE_LIMIT_MS - WARN_MS ? Math.ceil((IDLE_LIMIT_MS - idle) / 1000) : null);
    }, TICK_MS);
    return () => { clearInterval(beatTimer); clearInterval(tickTimer); };
  }, [beat, leave]);

  const isActive = (href) => pathname === href || pathname.startsWith(`${href}/`);

  const sidebar = (
    <div className="flex h-full flex-col bg-forest-900 text-forest-100">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-forest-800">
        <img src="/images/trust-logo.jpg" alt="The Mheza Trust logo" className="h-9 w-9 rounded-lg object-cover shrink-0" width={36} height={36} />
        <span className="leading-tight">
          <span className="block font-bold text-white text-sm">The Mheza Trust</span>
          <span className="block text-[10px] text-forest-300 uppercase tracking-wider font-semibold">Member Portal</span>
        </span>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5" aria-label="Member portal navigation">
        {NAV.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive(href) ? "bg-forest-700 text-white" : "text-forest-200 hover:bg-forest-800 hover:text-white"
            }`}
          >
            <Icon width={18} height={18} className="shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="px-5 py-4 border-t border-forest-800">
        <Link href="/" className="text-xs text-forest-300 hover:text-white">← Public website</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:block print:hidden">{sidebar}</aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden print:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} aria-hidden />
          <aside className="relative w-64 h-full">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-64 print:pl-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:px-6 print:hidden">
          <button className="lg:hidden p-2 rounded-md hover:bg-gray-100 cursor-pointer" onClick={() => setSidebarOpen(true)} aria-label="Open navigation menu">
            <MenuIcon width={22} height={22} />
          </button>

          <div className="hidden sm:block min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{member.name}</p>
            <p className="text-xs text-gray-500 truncate">River Edge Rural Village · Member</p>
          </div>

          <button
            className="ml-auto flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
            onClick={() => leave()}
          >
            <LogOutIcon width={16} height={16} />
            <span className="hidden sm:inline">Log Out</span>
          </button>
        </header>

        <main className="p-4 lg:p-6 print:p-0">{children}</main>
      </div>

      {secondsLeft !== null && (
        <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-lg print:hidden">
          <p className="text-sm font-semibold text-amber-900">Still there?</p>
          <p className="mt-1 text-xs text-amber-800">
            For your security the portal signs you out after 15 minutes of inactivity — in about {secondsLeft} second{secondsLeft === 1 ? "" : "s"}.
          </p>
          <button className="btn-primary btn-sm mt-3" onClick={() => beat(true)}>Stay signed in</button>
        </div>
      )}
    </div>
  );
}
