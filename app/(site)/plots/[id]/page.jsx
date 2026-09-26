import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { zar, dateFmt } from "@/lib/format";
import { StatusPill } from "@/components/ui";
import InterestForm from "@/components/InterestForm";
import { PLAN_W, PLAN_H } from "@/lib/plan-layout";
import { getAnySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const plot = await prisma.plot.findUnique({ where: { id: Number(id) } });
  return { title: plot ? `Erf ${plot.number} · River Edge Rural Village` : "Plot" };
}

export default async function PlotDetailPage({ params }) {
  if (!(await getAnySession())) redirect("/login");
  const { id } = await params;
  const plot = await prisma.plot.findUnique({ where: { id: Number(id) }, include: { project: true } });
  if (!plot) notFound();
  const neighbours = await prisma.plot.findMany({
    where: { projectId: plot.projectId },
    select: { id: true, number: true, x: true, y: true },
  });

  return (
    <>
      <section className="bg-forest-800 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="text-sm text-forest-200 mb-4" aria-label="Breadcrumb">
            <Link href="/plots" className="hover:text-white">← All plots</Link>
          </nav>
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="text-4xl font-extrabold text-white">Erf {plot.number}</h1>
            <StatusPill status={plot.status} />
            <span className="text-forest-200">Block {plot.block} · River Edge Rural Village</span>
          </div>
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid gap-10 lg:grid-cols-2">
          <div>
            <div className="rounded-2xl bg-earth-50 border border-earth-200 p-6 text-center">
              <svg viewBox={`0 0 ${PLAN_W} ${PLAN_H}`} className="w-full h-auto" role="img" aria-label={`Position of erf ${plot.number} on the River Edge layout plan`}>
                <rect x="16" y="24" width={PLAN_W - 32} height={PLAN_H - 40} rx="14" fill="#fbf7ef" stroke="#c8a27a" strokeWidth="3" strokeDasharray="12 6" />
                {neighbours.map((n) => (
                  <rect
                    key={n.id}
                    x={n.x - 13}
                    y={n.y - 10}
                    width="26"
                    height="20"
                    rx="3"
                    fill={n.id === plot.id ? "#e76f51" : "#cde7d4"}
                    stroke={n.id === plot.id ? "#7f1d1d" : "transparent"}
                    strokeWidth={n.id === plot.id ? 5 : 0}
                  />
                ))}
              </svg>
              <p className="mt-4 text-sm text-gray-600">Position of Erf {plot.number} (Block {plot.block}) on the official layout plan, highlighted.</p>
              <Link href="/projects/river-edge#map" className="btn-outline btn-sm mt-4">Open full interactive map</Link>
            </div>

            <div className="mt-8">
              <h2 className="text-xl font-bold text-forest-900 mb-3">About this plot</h2>
              <p className="text-gray-700 leading-relaxed">{plot.description}</p>
              <dl className="mt-6 grid grid-cols-2 gap-4">
                {[
                  ["Erf number", plot.number],
                  ["Block", plot.block],
                  ["Size", `${plot.sizeSqm}m²`],
                  ["Zoning", "Application for Rezoning to Residential Zoning 4 (Townhouse)"],
                  ["Road frontage", parseInt(plot.number, 10) % 2 === 0 ? "9m primary road" : "6m secondary road"],
                  ["Title", "Right of Use — title deed held by The Mheza Trust"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                    <dt className="text-xs text-gray-500 font-medium">{k}</dt>
                    <dd className="mt-0.5 font-semibold text-gray-900 text-sm">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-6 rounded-lg bg-blue-50 border border-blue-100 p-4 text-sm text-blue-800">
                📷 360° panoramic photos of this plot will be published here as soon as the media team has captured them. Site viewings are available every Saturday — <Link href="/contact#viewing" className="underline font-semibold">book a viewing</Link>.
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="text-lg font-bold text-forest-900 mb-4">Pricing & Payment Options</h2>
              <p className="text-4xl font-extrabold text-sunset-500">{zar(plot.price)}</p>
              <p className="text-sm text-gray-500">Promotional price until {dateFmt(plot.project.promoEndsAt)} · full payment required</p>
              <p className="text-sm text-gray-500 mt-1"><span className="line-through">{zar(plot.project.standardPrice)}</span> standard price thereafter</p>
              <ul className="mt-5 space-y-2 text-sm text-gray-700 border-t border-gray-100 pt-4">
                <li>✔ You acquire a heritable <strong>Right of Use</strong> — not a title deed (see <Link href="/terms" className="underline font-semibold text-forest-700">Terms and Conditions of Sale</Link>)</li>
                <li>✔ Certificate of Land Use issued on full payment</li>
                <li>✔ Member portal access for payment tracking and documents</li>
                <li>✔ Pay via EFT — reference: <span className="font-mono text-xs">{plot.number} – {'{your name}'}</span></li>
              </ul>
            </div>

            <div className="card p-6" id="interest">
              <InterestForm plot={plot} kind={plot.status === "SOLD" ? "REGISTER" : "INTEREST"} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
