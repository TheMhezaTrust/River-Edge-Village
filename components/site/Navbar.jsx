"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  ["/", "Home"],
  ["/about", "About Us"],
  ["/projects", "Projects"],
  ["/plots", "Plots"],
  ["/status", "Status"],
  ["/trust-info", "Trust Info"],
  ["/terms", "Terms"],
  ["/contact", "Contact"],
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
            <img src="/images/trust-logo.jpg" alt="The Mheza Trust logo" className="h-10 w-10 rounded-lg object-cover" width={40} height={40} />
            <span className="leading-tight">
              <span className="block font-bold text-forest-900 text-sm">The Mheza Trust</span>
              <span className="block text-[11px] text-earth-500 font-medium">River Edge Rural Village</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
            {LINKS.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(href) ? "text-forest-800 bg-forest-50" : "text-gray-600 hover:text-forest-800 hover:bg-forest-50"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-2">
            <Link href="/portal/register" className="btn-ghost btn-sm">Sign Up</Link>
            <Link href="/login" className="btn-outline btn-sm">Login</Link>
            <Link href="/plots" className="btn-accent btn-sm">View Available Plots</Link>
          </div>

          <button
            className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100 cursor-pointer"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label="Toggle navigation menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="lg:hidden border-t border-gray-200 bg-white px-4 py-3 space-y-1" aria-label="Mobile navigation">
          {LINKS.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`block rounded-md px-3 py-2 text-sm font-medium ${isActive(href) ? "text-forest-800 bg-forest-50" : "text-gray-600"}`}
            >
              {label}
            </Link>
          ))}
          <div className="pt-2 flex flex-col gap-2 border-t border-gray-100 mt-2">
            <Link href="/login" onClick={() => setOpen(false)} className="btn-primary btn-sm">Login</Link>
            <Link href="/portal/register" onClick={() => setOpen(false)} className="btn-outline btn-sm">Create Member Account</Link>
            <Link href="/plots" onClick={() => setOpen(false)} className="btn-accent btn-sm">View Available Plots</Link>
          </div>
        </nav>
      )}
    </header>
  );
}
