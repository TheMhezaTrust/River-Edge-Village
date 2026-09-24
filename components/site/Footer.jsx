import Link from "next/link";
import { TRUST } from "@/lib/contact";

export default function Footer() {
  return (
    <footer className="bg-forest-900 text-forest-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <img src="/images/trust-logo.jpg" alt="The Mheza Trust logo" className="h-10 w-10 rounded-lg object-cover bg-cream" width={40} height={40} />
              <span className="font-bold text-white">The Mheza Trust</span>
            </div>
            <p className="text-sm text-forest-200 leading-relaxed">
              Building legal, planned rural communities for South African families. Land held in trust, governed democratically, developed responsibly.
            </p>
            <p className="text-xs text-forest-300 mt-3 leading-relaxed">
              All The Mheza Trust projects are administered by River Edge Primary Co-Op.
            </p>
            <div className="flex gap-3 mt-5">
              {["Facebook", "X", "YouTube"].map((s) => (
                <a key={s} href="#" aria-label={s} className="h-9 w-9 rounded-full bg-forest-800 hover:bg-forest-700 flex items-center justify-center text-xs font-bold text-forest-200">
                  {s[0]}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              {[["/about", "About Us"], ["/projects", "Projects"], ["/projects/river-edge", "River Edge Rural Village"], ["/plots", "Available Plots"], ["/status", "Project Status"], ["/trust-info", "Trust Information"], ["/terms", "Terms & Conditions of Sale"], ["/contact", "Contact Us"], ["/login", "Login (Staff or Member)"], ["/portal/register", "Member Sign Up"]].map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-forest-200 hover:text-white transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Contact</h3>
            <ul className="space-y-3 text-sm text-forest-200">
              <li>
                <span className="block text-white font-medium">Phone</span>
                {TRUST.phones.map((p) => (
                  <a key={p} href={`tel:+27${p.slice(1).replace(/\s/g, "")}`} className="block hover:text-white">{p}</a>
                ))}
              </li>
              <li>
                <span className="block text-white font-medium">Email</span>
                <a href="mailto:themhezatrust@gmail.com" className="hover:text-white">themhezatrust@gmail.com</a>
              </li>
              <li>
                <span className="block text-white font-medium">Website</span>
                <a href={TRUST.siteUrl} className="hover:text-white">{TRUST.website}</a>
              </li>
              <li>
                <span className="block text-white font-medium">Office</span>
                Cove Ridge East, Buffalo City<br />Eastern Cape, South Africa
              </li>
              <li>
                <span className="block text-white font-medium">Hours</span>
                Mon–Fri 08:00–17:00 · Sat 09:00–13:00
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Official Banking Details</h3>
            <div className="rounded-lg bg-forest-800 p-4 text-sm space-y-2">
              <p><span className="text-forest-300">Bank:</span> <span className="text-white">Absa</span></p>
              <p><span className="text-forest-300">Account name:</span> <span className="text-white">River Edge SA Primary Co-operative Ltd</span></p>
              <p><span className="text-forest-300">Acc No:</span> <span className="text-white font-mono">4121013447</span></p>
              <p><span className="text-forest-300">Branch code:</span> <span className="text-white font-mono">632005</span></p>
              <p><span className="text-forest-300">Account type:</span> <span className="text-white">Current</span></p>
              <p className="text-xs text-forest-300 pt-2 border-t border-forest-700">
                Mandatory payment reference: <span className="text-white font-mono">{`{plot number} – {buyer name}`}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-forest-800 flex flex-col md:flex-row justify-between gap-3 text-xs text-forest-300">
          <p>
            © {new Date().getFullYear()} The Mheza Trust. All rights reserved. Registration Number {TRUST.registrationNumber}.{" "}
            <Link href="/terms" className="underline hover:text-white">Terms & Conditions of Sale</Link>
          </p>
          <p>Portion 2 of Farm 970, Cove Ridge East · Buffalo City Metropolitan Municipality</p>
        </div>
      </div>
    </footer>
  );
}
