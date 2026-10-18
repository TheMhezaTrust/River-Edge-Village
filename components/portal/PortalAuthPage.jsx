import Link from "next/link";
import { TRUST } from "@/lib/contact";

// Chrome for the signed-out portal screens (sign in, set password, forced change).
// The portal has no public Navbar or footer, so these pages carry the minimum:
// the Trust's identity, a way back to the website, and the office's contact number.
export default function PortalAuthPage({ children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <img src="/images/trust-logo.jpg" alt="The Mheza Trust logo" className="h-9 w-9 rounded-lg object-cover shrink-0" width={36} height={36} />
          <span className="leading-tight">
            <span className="block text-sm font-bold text-forest-900">The Mheza Trust</span>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-forest-600">Member Portal</span>
          </span>
        </div>
        <Link href="/" className="text-sm font-medium text-forest-700 hover:underline">← Back to website</Link>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-2">{children}</main>

      <footer className="border-t border-earth-200 bg-white/70 px-4 py-4 text-center text-xs text-gray-500">
        {TRUST.legalName} · Reg {TRUST.registrationNumber} · {TRUST.primaryPhone} ·{" "}
        <a href={`mailto:${TRUST.email}`} className="text-forest-700 hover:underline">{TRUST.email}</a>
      </footer>
    </div>
  );
}
