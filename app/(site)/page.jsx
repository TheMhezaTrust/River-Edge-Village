import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { zar, dateFmt } from "@/lib/format";
import InterestForm from "@/components/InterestForm";
import { SectionHeading } from "@/components/ui";
import { TRUST, sellerName, attorneyName } from "@/lib/contact";
import { getAnySession } from "@/lib/auth";
import { getSiteContent } from "@/lib/site-content";

export const metadata = {
  title: "The Mheza Trust | River Edge Rural Village – Your Land. Your Home. Your Future.",
  description:
    "River Edge Rural Village: residential 800m² plots on 31.9 hectares in Cove Ridge East, Buffalo City. Promotional price R75,000 until 30 November 2026. Prices, terms and conditions, contact details and member login.",
};

export const dynamic = "force-dynamic";

const STATUS_STYLE = {
  COMPLETED: { dot: "bg-forest-500", label: "Completed" },
  IN_PROGRESS: { dot: "bg-blue-500 animate-pulse", label: "In Progress" },
  PENDING: { dot: "bg-amber-400", label: "Pending" },
  ONGOING: { dot: "bg-trust-400 animate-pulse", label: "Ongoing" },
};

export default async function HomePage() {
  const session = await getAnySession();
  const isMember = session?.scope === "portal";
  const C = await getSiteContent();
  const project = await prisma.project.findUnique({ where: { slug: "river-edge" } });
  const announcements = await prisma.announcement.findMany({
    where: { audience: "PUBLIC" },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  const timeline = project?.timeline ? JSON.parse(project.timeline) : [];

  return (
    <>
      {/* ============ HERO: picture + login buttons ============ */}
      <section className="relative min-h-[88vh] flex items-center">
        <Image src="/images/hero.png" alt="Aerial view of River Edge Rural Village planned community" fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-r from-forest-900/90 via-forest-900/70 to-forest-900/30" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 w-full">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-sm font-medium text-forest-100 backdrop-blur mb-6">
              <span className="h-2 w-2 rounded-full bg-forest-400 animate-pulse" aria-hidden />
              {TRUST.legalName} · Registration Number {TRUST.registrationNumber}
            </p>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
              {C["home.heroTitle"]}
            </h1>
            <p className="mt-5 text-xl md:text-2xl text-forest-100 font-medium">
              {C["home.heroTagline"]}
            </p>
            <p className="mt-4 text-forest-200 max-w-xl">
              Residential 800m² plots on 31.9 hectares in Cove Ridge East, Buffalo City. From{" "}
              <strong className="text-white">{zar(project?.promoPrice)}</strong> until {dateFmt(project?.promoEndsAt)}.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="btn-accent px-7 py-3.5 text-base">Login</Link>
              <a href="#interest" className="btn-outline px-7 py-3.5 text-base border-white/40 text-white hover:bg-white/10">I'm Interested</a>
            </div>
            <p className="mt-4 text-xs text-forest-300">
              Staff sign in via <Link href="/login?to=staff" className="underline hover:text-white">Login → Administrator / Staff</Link>
            </p>
          </div>
        </div>
      </section>

      {/* ============ TRUST BASIC INFORMATION ============ */}
      <section className="py-16 bg-white" aria-label="Trust information">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Who We Are"
            title="Trust Information"
            subtitle={C["home.trustSubtitle"]}
          />
          <div className="grid gap-8 lg:grid-cols-3 items-start">
            <div className="lg:col-span-2">
              <div className="card overflow-hidden">
                <table className="table-base">
                  <tbody>
                    {[
                      ["Trust name", TRUST.legalName],
                      ["Registration number", TRUST.registrationNumber],
                      ["Flagship project", "River Edge Rural Village"],
                      ["Property", "Portion 2 of Farm 970, Cove Ridge East, Buffalo City Metropolitan Municipality"],
                      ["Extent", `31.9 hectares · residential plots of 800m² · 165 families`],
                      ["Original seller", sellerName(isMember, "Available to registered members")],
                      ["Trust attorney", attorneyName(isMember, "Available to registered members")],
                      ["Project administration", `All ${TRUST.legalName} projects are administered by ${TRUST.administrator}`],
                      ["Title deed", "Held by The Mheza Trust"],
                      ["What a buyer acquires", "A heritable Right of Use — not a title deed or land ownership"],
                      ["Zoning", "Application for Rezoning to Residential Zoning 4 (Townhouse) — BCMM is prepared to consider an application"],
                      ["CPA registration", "In progress with DALRRD"],
                    ].map(([k, v]) => (
                      <tr key={k}>
                        <th className="w-2/5 bg-white border-b border-gray-100 text-left">{k}</th>
                        <td className="text-gray-700 border-b border-gray-100">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/trust-info" className="btn-outline btn-sm">Full Trust Information</Link>
                <Link href="/about" className="btn-outline btn-sm">About The Trust</Link>
                <Link href="/terms" className="btn-outline btn-sm">Terms & Conditions of Sale</Link>
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl bg-sunset-500 p-6 text-white shadow-lg">
                <p className="text-sm font-semibold uppercase tracking-wide text-orange-100">Promotional Price</p>
                <p className="mt-1 text-4xl font-extrabold">{zar(project?.promoPrice)}</p>
                <p className="mt-1 text-sm text-orange-100">per 800m² plot · full payment</p>
                <p className="mt-4 pt-4 border-t border-white/25 text-sm">
                  Ends <strong>{dateFmt(project?.promoEndsAt)}</strong>. Thereafter {zar(project?.standardPrice)}.
                </p>
              </div>
              <div className="card p-5">
                <h3 className="font-bold text-forest-900 mb-3">Pricing at a glance</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex justify-between gap-3"><span>Promotional (until {dateFmt(project?.promoEndsAt)})</span><strong className="text-forest-700 whitespace-nowrap">{zar(project?.promoPrice)}</strong></li>
                  <li className="flex justify-between gap-3"><span>Standard thereafter</span><strong className="whitespace-nowrap">{zar(project?.standardPrice)}</strong></li>
                  <li className="flex justify-between gap-3"><span>Plot size</span><strong>800m²</strong></li>
                  <li className="flex justify-between gap-3"><span>Late payment interest</span><strong>2% per month</strong></li>
                  <li className="flex justify-between gap-3"><span>Transfer fee</span><strong>5% or R5,000</strong></li>
                </ul>
                <p className="mt-3 text-xs text-gray-500">{C["home.pricingNote"]}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ PROJECT PROGRESS ============ */}
      <section className="py-16 bg-white" aria-label="Project progress">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Where We Stand"
            title="Project Progress"
            subtitle={C["home.progressSubtitle"]}
          />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {timeline.map((item) => {
              const style = STATUS_STYLE[item.status] || STATUS_STYLE.PENDING;
              return (
                <div key={item.label} className="card p-5 flex gap-4">
                  <span className={`mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full ${style.dot}`} aria-hidden />
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-gray-900">{item.label}</h3>
                      <span className="text-xs font-semibold text-gray-500">{style.label}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                    {item.date && <p className="mt-2 text-xs text-gray-400">{item.date}</p>}
                  </div>
                </div>
              );
            })}
          </div>
          {announcements.length > 0 && (
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {announcements.map((a) => (
                <article key={a.id} className="card p-5">
                  <time className="text-xs text-gray-400">{dateFmt(a.createdAt)}</time>
                  <h3 className="mt-1 font-bold text-forest-900">{a.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{a.body}</p>
                </article>
              ))}
            </div>
          )}
          <div className="mt-8 text-center">
            <Link href="/status" className="btn-outline">Full Status Report →</Link>
          </div>
        </div>
      </section>

      {/* ============ TERMS AND CONDITIONS ============ */}
      <section className="py-16 bg-forest-800" aria-label="Terms and conditions">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid gap-10 lg:grid-cols-2 items-center">
          <div>
            <SectionHeading
              light
              center={false}
              eyebrow="Read Before You Buy"
              title="Terms and Conditions of Sale"
              subtitle={C["home.tncSubtitle"]}
            />
            <ul className="mt-6 space-y-2.5 text-sm text-forest-100">
              {[
                "You acquire a heritable Right of Use, not a title deed — ownership stays with the Trust until transfer to the CPA.",
                "On full payment you receive a Certificate of Land Use and the right to occupy, build, transfer and nominate beneficiaries.",
                "Residential use only: no animal farming, no slaughtering, no commercial or industrial activity.",
                "Building requires CPA Committee approval; setbacks are 5m front, 2m side, 3m rear.",
                "Annual levies are payable to the CPA; disputes go to mediation, then CSOS, then court.",
              ].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <span className="text-forest-400 shrink-0" aria-hidden>✔</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/terms" className="btn-accent">Read All 21 Clauses</Link>
            </div>
          </div>
          <div className="rounded-2xl bg-white/95 p-6 shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Document</p>
            <h3 className="mt-1 text-lg font-bold text-forest-900">Terms and Conditions of Sale</h3>
            <p className="text-sm text-gray-600">River Edge Rural Village – Portion 2 of Farm 970</p>
            <dl className="mt-4 space-y-2 text-sm border-t border-gray-100 pt-4">
              {[
                ["Trust", `${TRUST.legalName}`],
                ["Registration number", TRUST.registrationNumber],
                ["Effective date", "April 2025"],
                ["Last updated", "24 September 2026"],
                ["Clauses", "21"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-gray-500">{k}</dt>
                  <dd className="font-semibold text-gray-900 text-right">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs text-gray-500 border-t border-gray-100 pt-4">
              Signing the Acknowledgement of Payment and Plot Allocation form binds you to every clause and to the Community Constitution.
            </p>
          </div>
        </div>
      </section>

      {/* ============ CONTACT DETAILS ============ */}
      <section className="py-16 bg-white" aria-label="Contact details">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Get In Touch" title="Contact Details" subtitle="Talk to a person before you pay anything." />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["📞", "Phone", TRUST.phones],
              ["✉️", "Email", [TRUST.email]],
              ["📍", "Office", ["Cove Ridge East", "Buffalo City Metropolitan Municipality", "Eastern Cape, South Africa"]],
              ["🕗", "Hours", ["Mon–Fri: 08:00–17:00", "Sat: 09:00–13:00", "Sun & public holidays: closed"]],
            ].map(([icon, title, lines]) => (
              <div key={title} className="card p-5">
                <span className="text-2xl" aria-hidden>{icon}</span>
                <h3 className="mt-2 font-bold text-forest-900">{title}</h3>
                {lines.map((l) => (
                  <p key={l} className="text-sm text-gray-600 mt-0.5">
                    {title === "Phone" ? <a href={`tel:+27${l.slice(1).replace(/\s/g, "")}`} className="hover:text-forest-700">{l}</a>
                      : title === "Email" ? <a href={`mailto:${l}`} className="hover:text-forest-700">{l}</a>
                      : l}
                  </p>
                ))}
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-lg bg-earth-50 border border-earth-200 p-4 text-sm text-gray-700">
            <strong>Never deposit cash.</strong> The Trust will never ask you to pay into a personal account. Official banking
            details appear on the <Link href="/trust-info" className="underline font-semibold text-forest-700">Trust Information</Link> page —
            verify by phone before paying.
          </div>
          <div className="mt-6 text-center">
            <Link href="/contact" className="btn-outline">Full Contact Page & Site Viewing Bookings</Link>
          </div>
        </div>
      </section>

      {/* ============ INTEREST FORM ============ */}
      <section id="interest" className="py-16 bg-earth-50 border-t border-earth-100" aria-label="Register your interest">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading
              center={false}
              eyebrow="Your Details"
              title="Interested? Leave Your Details"
              subtitle="A consultant will contact you within 24–48 hours. This does not create an account or reserve a plot — it lets us call you back."
            />
            <div className="card p-5 space-y-3 text-sm text-gray-700">
              <p className="font-semibold text-forest-900">Already a member?</p>
              <p>Sign in to see your own payment history, outstanding balance and documents — that information is never public and never shown to another member.</p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/login" className="btn-primary btn-sm">Login</Link>
              </div>
            </div>
            <div className="mt-6 relative rounded-2xl overflow-hidden">
              <Image src="/images/community.png" alt="A South African family on their plot at River Edge Rural Village" width={1536} height={1024} className="w-full" />
            </div>
          </div>
          <div className="card p-6 md:p-8 h-fit">
            <InterestForm kind="INTEREST" />
          </div>
        </div>
      </section>
    </>
  );
}
