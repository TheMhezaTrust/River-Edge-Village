"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { can, ROLES } from "@/lib/roles";
import { PermissionsProvider } from "@/components/ws/permissions";
import { dateTimeFmt } from "@/lib/format";

const NAV = [
  { href: "/workstation", label: "Dashboard", icon: "📊", perm: null },
  { href: "/workstation/members", label: "Members", icon: "👥", perm: "members:view" },
  { href: "/workstation/plots", label: "Plots", icon: "🗺️", perm: "plots:view" },
  { href: "/workstation/inquiries", label: "Inquiries", icon: "💬", perm: "inquiries:view" },
  { href: "/workstation/finance", label: "Finance", icon: "💰", perm: "finance:view" },
  { href: "/workstation/departments", label: "Departments", icon: "🏛️", perm: "departments:view" },
  { href: "/workstation/tasks", label: "Tasks", icon: "✅", perm: "tasks:view" },
  { href: "/workstation/communication", label: "Communication", icon: "✉️", perm: "communication:view" },
  { href: "/workstation/reports", label: "Reports", icon: "📈", perm: "reports:view" },
  { href: "/workstation/content", label: "Website Content", icon: "📝", perm: "settings:manage" },
  { href: "/workstation/settings", label: "Settings", icon: "⚙️", perm: null },
];

export default function WorkstationShell({ user, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const bellRef = useRef(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const data = await api.get("/api/communication/notifications");
        if (alive) setNotifications(data);
      } catch {
        if (alive && notifications.length === 0) setNotifications([]);
      }
    };
    load();
    const t = setInterval(load, 60000);
    return () => { alive = false; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onClick(e) {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const visibleNav = NAV.filter((item) => !item.perm || can(user, item.perm));
  const unread = notifications.filter((n) => !n.isRead).length;
  const isActive = (href) => (href === "/workstation" ? pathname === "/workstation" : pathname.startsWith(href));

  async function logout() {
    await api.post("/api/auth/logout");
    router.push("/workstation/login");
    router.refresh();
  }

  async function markAllRead() {
    await api.put("/api/communication/notifications", { all: true }).catch(() => {});
    setNotifications((ns) => ns.map((n) => ({ ...n, isRead: true })));
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-forest-900 text-forest-100">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-forest-800">
        <img src="/images/trust-logo.jpg" alt="The Mheza Trust logo" className="h-9 w-9 rounded-lg object-cover shrink-0" width={36} height={36} />
        <span className="leading-tight">
          <span className="block font-bold text-white text-sm">The Mheza Trust</span>
          <span className="block text-[10px] text-forest-300 uppercase tracking-wider font-semibold">Workstation</span>
        </span>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5" aria-label="Workstation navigation">
        {visibleNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive(item.href) ? "bg-forest-700 text-white" : "text-forest-200 hover:bg-forest-800 hover:text-white"
            }`}
          >
            <span aria-hidden>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="px-5 py-4 border-t border-forest-800">
        <Link href="/" className="text-xs text-forest-300 hover:text-white">← Public website</Link>
      </div>
    </div>
  );

  return (
    <PermissionsProvider user={user}>
    <div className="min-h-screen bg-gray-100">
      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:block">{sidebar}</aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} aria-hidden />
          <aside className="relative w-64 h-full">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 lg:px-6">
          <button className="lg:hidden p-2 rounded-md hover:bg-gray-100 cursor-pointer" onClick={() => setSidebarOpen(true)} aria-label="Open navigation menu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>

          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">{ROLES[user.role]}{user.title && user.title !== ROLES[user.role] ? ` · ${user.title}` : ""}</p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Notifications */}
            <div className="relative" ref={bellRef}>
              <button
                className="relative p-2 rounded-lg hover:bg-gray-100 cursor-pointer"
                onClick={() => setBellOpen((o) => !o)}
                aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
                aria-expanded={bellOpen}
              >
                <span className="text-xl" aria-hidden>🔔</span>
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-sunset-500 text-white text-[10px] font-bold">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>
              {bellOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <p className="font-semibold text-sm text-gray-900">Notifications</p>
                    {unread > 0 && <button onClick={markAllRead} className="text-xs text-forest-700 hover:underline cursor-pointer">Mark all read</button>}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 && <p className="p-4 text-sm text-gray-500">No notifications.</p>}
                    {notifications.map((n) => (
                      <div key={n.id} className={`px-4 py-3 border-b border-gray-50 text-sm ${n.isRead ? "text-gray-500" : "bg-forest-50/50 text-gray-800"}`}>
                        <p>{n.text}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{dateTimeFmt(n.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User menu */}
            <div className="relative">
              <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 cursor-pointer" onClick={() => setUserMenuOpen((o) => !o)} aria-expanded={userMenuOpen} aria-label="User menu">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-700 text-white text-sm font-bold" aria-hidden>
                  {user.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </span>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">{user.name.split(" ")[0]}</span>
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                    <p className="text-xs text-forest-700 font-medium mt-1">{ROLES[user.role]}</p>
                    {user.lastLoginAt && <p className="text-[11px] text-gray-400 mt-1">Last login: {dateTimeFmt(user.lastLoginAt)}</p>}
                  </div>
                  <Link href="/workstation/settings" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">Profile & Settings</Link>
                  <button onClick={logout} className="block w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 cursor-pointer">Sign Out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
    </PermissionsProvider>
  );
}
