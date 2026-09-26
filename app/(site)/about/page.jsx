import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { SectionHeading } from "@/components/ui";
import { zar } from "@/lib/format";
import { getSiteContent } from "@/lib/site-content";

export const metadata = {
  title: "About Us",
  description: "The Mheza Trust — background, mission, trustees, and our commitment to legal, compliant rural land development.",
};
export const dynamic = "force-dynamic";

const VALUES = [
  ["Legality First", "Every step of our development follows South African law — title deeds, zoning, CPA registration, and departmental approvals."],
  ["Transparency", "We publish our progress openly. Members and the public can track every approval and milestone."],
  ["Community Empowerment", "Land ownership that builds generational wealth and democratic community governance."],
  ["Rural Dignity", "Rural communities deserve planned, serviced, beautiful environments — not informal compromises."],
];

const TRUSTEES = [
  ["Bongani Sifiniza", "Trustee"],
  ["Lihle Jacob", "Trustee"],
  ["Sydney Velapi", "Trustee"],
  ["Sisanda Toni", "Trustee"],
  ["Sipho Jauka", "Trustee"],
];

export default async function AboutPage() {
  const project = await prisma.project.findUnique({ where: { slug: "river-edge" } });
  const C = await getSiteContent();

  return (
    <>
      <section className="bg-forest-800 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-forest-300 mb-2">About Us</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight max-w-3xl">
            {C["about.heroTitle"]}
          </h1>
          <p className="mt-4 text-lg text-forest-100 max-w-3xl">
            {C["about.heroSubtitle"]}
          </p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid gap-12 lg:grid-cols-2 items-start">
          <div>
            <h2 className="text-2xl font-bold text-forest-900 mb-4">Our Background</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                The Mheza Trust was established to solve a problem that has plagued rural South Africa for generations: families living on
                land without legal security. Informal occupation means no title, no services, constant fear of demolition, and no asset to
                pass on to children.
              </p>
              <p>
                The Trust purchased Portion 2 of Farm 970 in Cove Ridge East — 31.9 hectares of titled land within the Buffalo City
                Metropolitan Municipality — and is developing it into <strong>River Edge Rural Village</strong>: a fully planned residential
                community for 165 families, with erf numbers matching the official survey layout plan.
              </p>
              <p>
                <strong>All The Mheza Trust projects are administered by River Edge Primary Co-Op</strong>, which handles the day-to-day
                running of River Edge Rural Village on behalf of the Trust and its beneficiaries.
              </p>
              <p>
                The Trust is the <strong>legal owner</strong> of the land, registered with the Master of the High Court. It holds the property
                in trust for the benefit of the community and plot holders, while a Communal Property Association (CPA) registration — in
                progress with DALRRD — will give members democratic governance over the community&apos;s affairs.
              </p>
            </div>

            <div className="mt-8 grid sm:grid-cols-2 gap-4">
              <div className="card p-5 border-l-4 border-l-forest-600">
                <h3 className="font-bold text-forest-900">Our Mission</h3>
                <p className="mt-2 text-sm text-gray-600">
                  {C["about.mission"]}
                </p>
              </div>
              <div className="card p-5 border-l-4 border-l-sunset-500">
                <h3 className="font-bold text-forest-900">Our Vision</h3>
                <p className="mt-2 text-sm text-gray-600">
                  {C["about.vision"]}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Image src="/images/community.png" alt="Families at River Edge Rural Village" width={1536} height={1024} className="rounded-2xl shadow-lg w-full" />
            <div className="card p-6 bg-earth-50 border-earth-200">
              <h3 className="font-bold text-forest-900 mb-3">Our Values</h3>
              <ul className="space-y-3">
                {VALUES.map(([title, desc]) => (
                  <li key={title} className="flex gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-forest-500 shrink-0" aria-hidden />
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{title}</p>
                      <p className="text-sm text-gray-600">{desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CPA explanation */}
      <section className="py-16 bg-earth-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <h2 className="text-2xl font-bold text-forest-900">The CPA Registration Process</h2>
            <p className="mt-3 text-gray-600 text-sm leading-relaxed">
              A Communal Property Association (CPA) is a legal structure under South African law that allows communities to own and manage
              property collectively and democratically.
            </p>
          </div>
          <ol className="lg:col-span-2 space-y-4">
            {[
              ["Constitution drafted", "The community constitution — the rules of democratic governance — was drafted with legal assistance."],
              ["Submission to DALRRD", "The full CPA registration pack was submitted to the Department of Agriculture, Land Reform and Rural Development."],
              ["Verification in progress", "DALRRD is verifying trustees, beneficiary lists, and the constitution. Status: In Progress."],
              ["Registration & first general meeting", "Once registered, the CPA will hold its first general meeting where members elect their governing structures."],
            ].map(([title, desc], i) => (
              <li key={title} className="card p-5 flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-700 text-white font-bold">{i + 1}</span>
                <div>
                  <h3 className="font-semibold text-gray-900">{title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Trustees */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Governance" title="Trustees" subtitle="The people accountable for the Trust — and to the community." />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {TRUSTEES.map(([name, role]) => (
              <div key={name} className="card p-6">
                <div className="flex items-center gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-forest-100 text-forest-800 font-bold text-lg" aria-hidden>
                    {name.split(" ").map((n) => n[0]).join("")}
                  </span>
                  <div>
                    <h3 className="font-bold text-gray-900">{name}</h3>
                    <p className="text-sm text-forest-700 font-medium">{role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Difference */}
      <section className="py-16 bg-forest-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading light eyebrow="Why We're Different" title="Not Another Land Developer" />
          <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
            {[
              ["We own the land outright", "The title deed is registered in the Trust's name. No options, no leases, no third-party land — the Trust purchased and paid for Portion 2 of Farm 970."],
              ["We follow the process, publicly", "Rezoning with BCMM, CPA registration with DALRRD, sanitation no-objection received. Our status page publishes the project timeline and public announcements."],
              ["We are funded by sales, not debt", "Plot sales fund infrastructure and compliance work. The Trust is self-funded, serious, and accountable to its members."],
              ["Membership means ownership security", "Plot holders become beneficiaries of a governed community with democratic structures — not customers of a developer who disappears."],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-xl bg-forest-900/60 border border-forest-700 p-6">
                <h3 className="font-bold text-white">{title}</h3>
                <p className="mt-2 text-sm text-forest-200 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/projects/river-edge" className="btn-accent px-7 py-3">Explore River Edge — from {zar(project?.promoPrice)}</Link>
          </div>
        </div>
      </section>
    </>
  );
}
