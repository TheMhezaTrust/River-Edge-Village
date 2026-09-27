import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { SectionHeading, StatusPill } from "@/components/ui";
import { zar, dateFmt } from "@/lib/format";
import { TRUST } from "@/lib/contact";
import { getSiteContent } from "@/lib/site-content";

export const metadata = {
  title: "The Mheza Trust | Legal, planned rural communities for South African families",
  description:
    "The Mheza Trust (Registration Number IT000099/2024(E)) holds land in trust and supports independent, community-driven rural developments across the Eastern Cape. Our mission, vision, background and projects.",
};

export const dynamic = "force-dynamic";

// The Trust's approach: it does not run communities directly, it is the legal
// umbrella under which independent, self-governing projects operate.
const APPROACH = [
  [
    "🏛️",
    "An umbrella, not an operator",
    "The Trust holds the land and carries the legal, compliance and governance backbone. Each development runs as its own independent project with its own assets, rules and finances.",
  ],
  [
    "🤝",
    "Communities govern themselves",
    "Every project adopts its own constitution and, where applicable, registers a Communal Property Association (CPA) so members elect the structures that manage their village.",
  ],
  [
    "⚖️",
    "Legality first",
    "Title is held in trust, rezoning and departmental approvals are pursued openly, and progress is published so families can verify every step before they commit.",
  ],
  [
    "🌱",
    "Funded by sales, not debt",
    "Plot sales fund infrastructure and compliance work. The Trust is self-funded and accountable to the members of each project it serves.",
  ],
];

export default async function HomePage() {
  const C = await getSiteContent();
  const projects = await prisma.project.findMany({ orderBy: { id: "asc" } });

  // Active promotions across ALL projects under the Trust: a project qualifies
  // when it has a promotional price whose end date is today or later.
  const now = Date.now();
  const promos = projects.filter(
    (p) => p.promoPrice && p.promoEndsAt && new Date(p.promoEndsAt).getTime() >= now,
  );

  return (
    <>
      {/* ============ HERO: The Mheza Trust as parent organisation ============ */}
      <section className="relative bg-forest-900 overflow-hidden">
        {/* Background image: place the new Trust-level photo at
            public/images/trust-hero.jpg. Until then the forest gradient shows. */}
        <Image
          src="/images/trust-hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-forest-900/95 via-forest-900/80 to-forest-900/45" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/trust-logo.jpg"
                alt="The Mheza Trust logo"
                className="h-14 w-14 rounded-xl object-cover bg-cream ring-2 ring-white/20"
                width={56}
                height={56}
              />
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-sm font-medium text-forest-100 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-forest-400 animate-pulse" aria-hidden />
                Registration Number {TRUST.registrationNumber}
              </p>
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
              The Mheza Trust
            </h1>
            <p className="mt-5 text-xl md:text-2xl text-forest-100 font-medium">
              Legal owner. Honest steward. The umbrella for community-driven rural development.
            </p>
            <p className="mt-5 text-forest-200 max-w-2xl text-lg leading-relaxed">
              We hold land in trust for South African families and support a growing family of
              independent, self-governing projects across the Eastern Cape — each developed legally,
              transparently, and permanently.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/projects" className="btn-accent px-7 py-3.5 text-base">Explore Our Projects</Link>
              <Link href="/about" className="btn-outline px-7 py-3.5 text-base border-white/40 text-white hover:bg-white/10">About The Trust</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CURRENT OPPORTUNITIES (active promotions) ============ */}
      {promos.length > 0 && (
        <section className="py-14 bg-sunset-500" aria-label="Current opportunities">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-orange-100">Current Opportunities</p>
            <h2 className="mt-1 text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Active Promotions
            </h2>
            <p className="mt-2 text-orange-50 max-w-2xl">
              Limited-time offers across The Mheza Trust projects. Each promotion belongs to its own
              independent project — follow through for full details and terms.
            </p>
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {promos.map((p) => (
                <div key={p.id} className="rounded-2xl bg-white p-6 shadow-lg flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-forest-900 text-lg leading-snug">{p.name}</h3>
                    <StatusPill status={p.status} />
                  </div>
                  <p className="mt-1 text-sm text-gray-500 flex items-center gap-1">📍 {p.location}</p>
                  <p className="mt-4 text-4xl font-extrabold text-sunset-600">{zar(p.promoPrice)}</p>
                  <p className="text-sm text-gray-600">
                    promotional price
                    {p.standardPrice ? ` · thereafter ${zar(p.standardPrice)}` : ""}
                  </p>
                  <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-forest-700">
                    <span aria-hidden>⏳</span> Ends {dateFmt(p.promoEndsAt)}
                  </p>
                  <Link href={`/projects/${p.slug}`} className="btn-primary mt-5 self-start">
                    View {p.name} →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ BACKGROUND + MISSION / VISION ============ */}
      <section className="py-16 md:py-20 bg-white" aria-label="About the Trust">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid gap-12 lg:grid-cols-2 items-start">
          <div>
            <SectionHeading center={false} eyebrow="Who We Are" title="Our Background" />
            <div className="mt-6 space-y-4 text-gray-700 leading-relaxed">
              <p>
                The Mheza Trust was founded by its Trustees, who united around a shared vision to
                address the escalating peri-urban challenges across the Eastern Cape, particularly
                within the Buffalo City Metro Municipality (BCMM). They witnessed firsthand the
                devastating impact of illegitimate land dealings, where vulnerable individuals faced
                not only the demolition of their homes but also the loss of their life savings.
              </p>
              <p>
                Driven by a commitment to protect these communities, The Mheza Trust was established
                to provide a lasting, lawful solution. Recognising that the Trust structure is not
                designed to directly run communities, but rather to serve as an umbrella for multiple
                independent, community-driven projects, the Trust empowers each community to govern
                itself through its own constitution.
              </p>
              <p>
                The Mheza Trust is formally registered by the Master of the High Court under Trust
                Number {TRUST.registrationNumber}, finalised in 2024.
              </p>
            </div>
            <div className="mt-8">
              <Link href="/about" className="btn-outline btn-sm">Read Our Full Story →</Link>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-6 border-l-4 border-l-forest-600">
              <h3 className="font-bold text-forest-900 text-lg">Our Mission</h3>
              <p className="mt-2 text-gray-600 leading-relaxed">{C["about.mission"]}</p>
            </div>
            <div className="card p-6 border-l-4 border-l-sunset-500">
              <h3 className="font-bold text-forest-900 text-lg">Our Vision</h3>
              <p className="mt-2 text-gray-600 leading-relaxed">{C["about.vision"]}</p>
            </div>
            <div className="rounded-xl bg-earth-50 border border-earth-200 p-6">
              <h3 className="font-bold text-forest-900">The core mission</h3>
              <p className="mt-2 text-sm text-gray-700 leading-relaxed">
                To facilitate access to legitimate, legally secure land for individuals who cannot
                afford traditional bank bonds — bridging the critical gap between communities and
                government, and ensuring development always occurs within the framework of the law.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ APPROACH TO COMMUNITY-DRIVEN PROJECTS ============ */}
      <section className="py-16 md:py-20 bg-forest-50/50" aria-label="Our approach">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="How We Work"
            title="Our Approach to Community-Driven Projects"
            subtitle="The Trust provides the legal foundation and stewardship; each community builds and governs its own village."
          />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {APPROACH.map(([icon, title, desc]) => (
              <div key={title} className="card p-6 h-full">
                <span className="text-3xl" aria-hidden>{icon}</span>
                <h3 className="mt-3 font-bold text-forest-900 text-lg">{title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PROJECTS TEASER ============ */}
      <section className="py-16 md:py-20 bg-white" aria-label="Our projects">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Under The Trust"
            title="Our Projects"
            subtitle="Each project is independent — with its own land, community, rules and finances — united under the stewardship of The Mheza Trust."
          />
          <div className="mt-10 grid gap-8 md:grid-cols-2">
            {projects.map((p) => {
              const isActive = p.slug === "river-edge";
              return (
                <article key={p.id} className="card overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
                  <div className={`h-44 relative ${isActive ? "bg-forest-700" : "bg-earth-200"}`}>
                    {isActive ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src="/images/hero.png" alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-earth-100 to-earth-200">
                        <span className="text-6xl" aria-hidden>🌄</span>
                      </div>
                    )}
                    <div className="absolute top-4 right-4"><StatusPill status={p.status} /></div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-2xl font-bold text-forest-900">{p.name}</h3>
                    <p className="mt-1 text-sm text-gray-500 flex items-center gap-1">📍 {p.location}</p>
                    <p className="mt-3 text-sm text-gray-600 leading-relaxed flex-1">
                      {p.description.slice(0, 200)}{p.description.length > 200 ? "…" : ""}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-700">
                      {p.farmSizeHa && <span><strong>{p.farmSizeHa}</strong> ha</span>}
                      {p.familyCount && <span><strong>{p.familyCount}</strong> families</span>}
                      {p.promoPrice && <span className="text-sunset-500 font-bold">from {zar(p.promoPrice)}</span>}
                    </div>
                    <Link href={`/projects/${p.slug}`} className="btn-primary mt-6 self-start">View Project →</Link>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="mt-10 text-center">
            <Link href="/projects" className="btn-outline">View All Projects →</Link>
          </div>
        </div>
      </section>

      {/* ============ GOVERNANCE / REGISTRATION BAND ============ */}
      <section className="py-16 bg-forest-800" aria-label="Governance">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid gap-10 lg:grid-cols-3 items-center">
          <div className="lg:col-span-2">
            <SectionHeading
              light
              center={false}
              eyebrow="Accountable & Registered"
              title="Governed in the Open"
              subtitle="The Mheza Trust is registered with the Master of the High Court and governed by its Trustees, who are accountable both to the Trust and to every community it serves."
            />
            <dl className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                ["Trust name", TRUST.legalName],
                ["Registration number", TRUST.registrationNumber],
                ["Registered", "Master of the High Court, 2024"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-forest-900/50 border border-forest-700 p-4">
                  <dt className="text-xs uppercase tracking-wide text-forest-300">{k}</dt>
                  <dd className="mt-1 font-semibold text-white text-sm">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/trust-info" className="btn-accent px-6 py-3 text-center">Full Trust Information</Link>
            <Link href="/about" className="btn-outline px-6 py-3 text-center border-white/40 text-white hover:bg-white/10">Meet the Trustees</Link>
            <Link href="/status" className="btn-outline px-6 py-3 text-center border-white/40 text-white hover:bg-white/10">Project Status Reports</Link>
          </div>
        </div>
      </section>

      {/* ============ CONTACT CTA ============ */}
      <section className="py-16 bg-earth-50 border-t border-earth-100" aria-label="Contact">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <SectionHeading
            eyebrow="Get In Touch"
            title="Talk to Us Before You Commit"
            subtitle="Whether you want to learn more about a project, book a site viewing, or verify our details, a person from the Trust will help you."
          />
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/contact" className="btn-primary px-7 py-3.5">Contact The Trust</Link>
            <a href={TRUST.primaryPhoneHref} className="btn-outline px-7 py-3.5">Call {TRUST.primaryPhone}</a>
          </div>
          <p className="mt-6 text-sm text-gray-600">
            Already a member or staff? <Link href="/login" className="underline font-semibold text-forest-700">Log in here</Link>.
          </p>
        </div>
      </section>
    </>
  );
}
