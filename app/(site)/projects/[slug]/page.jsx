import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { zar, dateFmt } from "@/lib/format";
import { SectionHeading, StatusPill } from "@/components/ui";
import InterestForm from "@/components/InterestForm";
import { getSiteContent } from "@/lib/site-content";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug } });
  return { title: project?.name || "Project", description: project?.description?.slice(0, 160) };
}

const INFRASTRUCTURE = [
  ["💧", "Rainwater Harvesting System", "Every plot is designed for rainwater harvesting: roof catchment from your home feeds a JoJo-style storage tank, providing household and garden water. This reduces dependence on municipal supply, lowers your running costs, and is endorsed in the development's water strategy. The farm's existing dam provides supplementary water for construction and communal use."],
  ["🚽", "Septic Tank System", "Each plot uses an individual septic tank system — a sanitation approach for which the BCMM Sanitation Division has issued a formal no-objection. Soil percolation testing has been completed to confirm suitability. The system is inspected at building-plan stage and requires no municipal sewerage reticulation, keeping plot costs affordable."],
  ["⚡", "Eskom Electricity", "An existing Eskom connection serves the farm. As rezoning is finalised, electrical reticulation will be extended to each block, with individual connections available to homeowners through standard Eskom application processes."],
  ["🛣️", "Road Network", "Primary roads carry a 9–11m reserve and secondary roads a 6m minimum — wider than most urban subdivisions. Gravel-surfaced initially and designed for future upgrading, the network ensures emergency vehicle access, school transport, and all-weather usability."],
  ["🏞️", "Dam and Setback Compliance", "The farm's dam is retained as a community feature with legally compliant setbacks. No plot encroaches on the dam buffer, and green belts surround it — protecting water quality and creating a natural recreational centerpiece for the village."],
];

const COMMUNITY_VALUES = [
  ["Residential only", "The village is zoned for residential use — no industrial or commercial encroachment."],
  ["No animal farming", "To maintain a peaceful suburban-rural environment, livestock farming is not permitted."],
  ["No slaughtering", "Slaughtering on plots is prohibited, protecting hygiene and neighbourly comfort."],
  ["Peaceful, family-friendly", "Noise, nuisance and illegal activities are governed by community rules adopted through the CPA."],
  ["Legal compliance", "Building plans and land use follow municipal requirements — the Certificate of Land Use is issued per plot."],
  ["Democratic governance", "Rules are made by members, for members, through the CPA's elected structures."],
  ["Rural heritage preserved", "Green belts, the dam, and indigenous planting keep the rural character alive within a modern, compliant framework."],
];

const TIMELINE_ICONS = { COMPLETED: "✅", IN_PROGRESS: "🔄", PENDING: "⏳", ONGOING: "🔵" };

export default async function ProjectPage({ params }) {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project) notFound();
  const C = await getSiteContent();

  const announcements = await prisma.announcement.findMany({
    where: { audience: "PUBLIC" },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  const timeline = project.timeline ? JSON.parse(project.timeline) : [];

  return (
    <>
      {/* Hero */}
      <section className="relative bg-forest-900">
        <img src="/images/hero.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          {project.slug === "river-edge" && (
            <img src="/images/river-edge-logo.jpg" alt="River Edge Rural Village logo" className="h-16 w-auto rounded-xl bg-white/95 p-1.5 mb-5 shadow-lg" />
          )}
          <div className="flex items-center gap-3 mb-4">
            <StatusPill status={project.status} />
            <span className="text-sm text-forest-200">{C["project.heroBadge"]}</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight">{project.name}</h1>
          <p className="mt-3 text-lg text-forest-100 max-w-3xl">{project.address}</p>
          <dl className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-4 max-w-4xl">
            {[
              ["Farm size", `${project.farmSizeHa} ha`],
              ["Plots", `${project.plotCount} × 800m²`],
              ["Families", project.familyCount],
              ["Promotional price", zar(project.promoPrice)],
              ["Standard price", zar(project.standardPrice)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-white/10 backdrop-blur border border-white/15 p-4">
                <dt className="text-xs text-forest-200 font-medium">{label}</dt>
                <dd className="mt-1 text-lg font-bold text-white">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm text-sunset-400 font-semibold">Promotional pricing valid until {dateFmt(project.promoEndsAt)} · full payment required to qualify.</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a href="#express-interest" className="btn-white px-6 py-3">Express Interest</a>
          </div>
        </div>
      </section>

      {/* Overview */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SectionHeading center={false} eyebrow="Project Overview" title={C["project.overviewTitle"]} />
            <p className="text-gray-700 leading-relaxed text-lg">{project.description}</p>
          </div>
          <aside className="card p-6 bg-sunset-500 text-white border-0 shadow-lg h-fit">
            <p className="text-sm font-bold uppercase tracking-wide text-orange-100">Limited Time Offer</p>
            <p className="mt-2 text-4xl font-extrabold">{zar(project.promoPrice)}</p>
            <p className="text-orange-100">for 800m² plots</p>
            <ul className="mt-5 space-y-2 text-sm text-orange-50 border-t border-orange-400/50 pt-4">
              <li>✔ Ends {dateFmt(project.promoEndsAt)}</li>
              <li>✔ Full payment required to qualify</li>
              <li>✖ Increases to {zar(project.standardPrice)} thereafter</li>
            </ul>
            <a href="#express-interest" className="btn-white w-full mt-6">Claim the Promotional Price</a>
          </aside>
        </div>
      </section>

      {/* Development plan */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Development Plan" title="How the Land Is Subdivided" />
          <div className="grid gap-6 md:grid-cols-3">
            {[
              ["📐", "Subdivision", `A land surveyor registered with SAGC has laid out the 31.9 hectares into ${project.plotCount} erven of 800m² each, in five blocks (A–E). Erf numbers in this system match the official survey layout plan, including subdivided erven such as 1A, 145A/145B, 165A, 186A and 203A. An application for Rezoning to Residential Zoning 4 (Townhouse) is being prepared for submission to BCMM.`],
              ["🛣️", "Road network", "Blocks are separated by 9–11m primary road reserves with internal 6m secondary roads between plot rows — every plot has direct road frontage and emergency access."],
              ["🌳", "Green spaces", "Green belts are set aside within the village, and both dam areas are protected with compliant setbacks and wetland buffers, giving the village communal open space."],
            ].map(([icon, title, desc]) => (
              <div key={title} className="card p-6">
                <span className="text-3xl" aria-hidden>{icon}</span>
                <h3 className="mt-3 font-bold text-forest-900 text-lg">{title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Infrastructure */}
      <section className="py-16 bg-forest-50/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Infrastructure" title="Modern Services, Rural Setting" />
          <div className="space-y-4 max-w-4xl mx-auto">
            {INFRASTRUCTURE.map(([icon, title, desc]) => (
              <details key={title} className="card p-5 group" open={title.includes("Rainwater")}>
                <summary className="flex items-center gap-3 cursor-pointer font-bold text-forest-900 list-none">
                  <span className="text-2xl" aria-hidden>{icon}</span>
                  {title}
                  <span className="ml-auto text-gray-400 group-open:rotate-180 transition-transform" aria-hidden>▾</span>
                </summary>
                <p className="mt-3 text-sm text-gray-600 leading-relaxed pl-11">{desc}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Community values */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Community Values" title="The Rules That Keep River Edge Peaceful" subtitle="Adopted democratically through the CPA and enforceable against every plot holder." />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {COMMUNITY_VALUES.map(([title, desc]) => (
              <div key={title} className="rounded-xl border border-forest-200 bg-forest-50/60 p-5">
                <h3 className="font-bold text-forest-900 flex items-center gap-2"><span aria-hidden>✓</span>{title}</h3>
                <p className="mt-1.5 text-sm text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16 bg-earth-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Project Timeline" title="The Journey So Far — and Ahead" />
          <ol className="relative max-w-3xl mx-auto border-l-2 border-forest-200 ml-4">
            {timeline.map((item) => (
              <li key={item.label} className="mb-8 ml-8 relative">
                <span className="absolute -left-[52px] flex h-10 w-10 items-center justify-center rounded-full bg-white border-2 border-forest-300 text-lg" aria-hidden>
                  {TIMELINE_ICONS[item.status] || "⏳"}
                </span>
                <div className="card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-gray-900">{item.label}</h3>
                    <StatusPill status={item.status} />
                    {item.date && <span className="text-xs text-gray-500">{item.date}</span>}
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Testimonials" title="What Our Members Say" />
          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            {[
              ["“I bought Plot 49 for my three children. For the first time, our family will own land with a title — legally, safely. The Trust shows us every approval document they receive.”", "Nokwanda Z.", "Plot holder, Block B"],
              ["“What convinced me was the status page. I could see the sanitation no-objection and exactly where the BCMM rezoning application stands myself. No other seller offered that kind of proof.”", "Peter A.", "Full-payment buyer"],
            ].map(([quote, name, role]) => (
              <figure key={name} className="card p-6">
                <blockquote className="text-sm text-gray-700 leading-relaxed">{quote}</blockquote>
                <figcaption className="mt-4">
                  <p className="font-bold text-forest-900">{name}</p>
                  <p className="text-xs text-gray-500">{role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* News */}
      {announcements.length > 0 && (
        <section className="py-12 bg-gray-50 border-t border-gray-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl font-bold text-forest-900 mb-4">Project Announcements</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {announcements.map((a) => (
                <article key={a.id} className="card p-4">
                  <p className="text-xs text-gray-500">{dateFmt(a.createdAt)}</p>
                  <h3 className="font-semibold text-sm text-forest-900 mt-1">{a.title}</h3>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Express interest */}
      <section id="express-interest" className="py-16 bg-forest-800">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <SectionHeading light eyebrow="Take the Next Step" title="Express Interest or Buy a Plot" subtitle="Submit your details and a consultant will contact you within 24–48 hours." />
          <div className="rounded-2xl bg-white p-6 md:p-8 shadow-2xl">
            <InterestForm kind="INTEREST" />
          </div>
          <p className="mt-6 text-center text-sm text-forest-200">
            Prefer to talk? Call us or <Link href="/contact" className="underline font-semibold text-white">visit the contact page</Link> to schedule a site viewing.
          </p>
        </div>
      </section>
    </>
  );
}
