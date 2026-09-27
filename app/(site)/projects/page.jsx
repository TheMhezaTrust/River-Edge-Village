import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SectionHeading, StatusPill } from "@/components/ui";
import { zar } from "@/lib/format";

export const metadata = {
  title: "Projects",
  description: "The Mheza Trust developments — current and future planned rural communities.",
};
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({ orderBy: { id: "asc" } });

  return (
    <>
      <section className="bg-forest-800 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-forest-300 mb-2">Under The Mheza Trust</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">Our Projects</h1>
          <p className="mt-3 text-forest-100 max-w-2xl text-lg">
            The Mheza Trust is the legal umbrella; each project below is an independent,
            community-driven development with its own land, community, rules and finances. Every one
            is built on titled land, through legal process, with transparent progress.
          </p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2">
            {projects.map((p) => {
              const isActive = p.slug === "river-edge";
              return (
                <article key={p.id} className="card overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
                  <div className={`h-48 relative ${isActive ? "bg-forest-700" : "bg-earth-200"}`}>
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
                    <h2 className="text-2xl font-bold text-forest-900">{p.name}</h2>
                    <p className="mt-1 text-sm text-gray-500 flex items-center gap-1">📍 {p.location}</p>
                    <p className="mt-3 text-sm text-gray-600 leading-relaxed flex-1">{p.description.slice(0, 240)}{p.description.length > 240 ? "…" : ""}</p>
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
        </div>
      </section>
    </>
  );
}
