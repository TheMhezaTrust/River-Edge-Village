"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  ["/", "Home"],
  ["/about", "About Us"],
  ["/projects", "Projects"],
  ["/gallery", "Gallery"],
  ["/status", "Status"],
  ["/trust-info", "Trust Info"],
  ["/terms", "Terms"],
  ["/contact", "Contact"],
];

const ABOUT_SUB = [["/about/how-projects-work", "How Our Projects Work"]];
const ABOUT_CHILDREN = [["/about", "About Us Overview"], ...ABOUT_SUB];

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
              <span className="block text-[11px] text-earth-500 font-medium">Land held in trust for communities</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
            {LINKS.map(([href, label]) =>
              href === "/about" ? (
                <div key={href} className="relative group">
                  <Link
                    href={href}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive(href) ? "text-forest-800 bg-forest-50" : "text-gray-600 hover:text-forest-800 hover:bg-forest-50"
                    }`}
                  >
                    {label}
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="transition-transform group-hover:rotate-180" aria-hidden>
                      <path d="M2 3.5l3 3 3-3" />
                    </svg>
                  </Link>
                  <div className="absolute left-0 top-full hidden pt-1 group-hover:block group-focus-within:block">
                    <div className="w-60 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                      {ABOUT_CHILDREN.map(([childHref, childLabel]) => (
                        <Link
                          key={childHref}
                          href={childHref}
                          className={`block px-3 py-2 text-sm ${
                            pathname === childHref
                              ? "bg-forest-50 font-medium text-forest-800"
                              : "text-gray-600 hover:bg-forest-50 hover:text-forest-800"
                          }`}
                        >
                          {childLabel}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  key={href}
                  href={href}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive(href) ? "text-forest-800 bg-forest-50" : "text-gray-600 hover:text-forest-800 hover:bg-forest-50"
                  }`}
                >
                  {label}
                </Link>
              ),
            )}
          </nav>

          <div className="hidden lg:flex items-center gap-2">
            <Link href="/login" className="btn-outline btn-sm">Login</Link>
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
            <div key={href}>
              <Link
                href={href}
                onClick={() => setOpen(false)}
                className={`block rounded-md px-3 py-2 text-sm font-medium ${isActive(href) ? "text-forest-800 bg-forest-50" : "text-gray-600"}`}
              >
                {label}
              </Link>
              {href === "/about" && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-forest-100 pl-3">
                  {ABOUT_SUB.map(([subHref, subLabel]) => (
                    <Link
                      key={subHref}
                      href={subHref}
                      onClick={() => setOpen(false)}
                      className={`block rounded-md px-3 py-2 text-sm ${
                        pathname === subHref ? "font-medium text-forest-800 bg-forest-50" : "text-gray-600"
                      }`}
                    >
                      {subLabel}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div className="pt-2 flex flex-col gap-2 border-t border-gray-100 mt-2">
            <Link href="/login" onClick={() => setOpen(false)} className="btn-primary btn-sm">Login</Link>
          </div>
        </nav>
      )}
    </header>
  );
}
