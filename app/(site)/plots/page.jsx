import { prisma } from "@/lib/prisma";
import { dateFmt } from "@/lib/format";
import PlotsBrowser from "@/components/site/PlotsBrowser";
import Forbidden from "@/components/site/Forbidden";
import { sortPlotsByNumber } from "@/lib/plan-layout";
import { redirect } from "next/navigation";
import { getAnySession, isStaffAdmin } from "@/lib/auth";
import Link from "next/link";

export const metadata = {
  title: "Available Plots",
  description: "Browse all 216 plots at River Edge Rural Village, with erf numbers matching the official survey layout plan. Filter by availability and price, view details, and express interest.",
};
export const dynamic = "force-dynamic";

export default async function PlotsPage() {
  const session = await getAnySession();
  if (!session) redirect("/login");
  if (!isStaffAdmin(session)) return <Forbidden />;
  const project = await prisma.project.findUnique({ where: { slug: "river-edge" } });
  const plots = sortPlotsByNumber(await prisma.plot.findMany({
    where: { projectId: project.id },
    select: { id: true, number: true, sizeSqm: true, price: true, status: true, block: true, x: true, y: true },
  }));

  return (
    <>
      <section className="bg-forest-800 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-forest-300 mb-2">River Edge Rural Village</p>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">Available Plots</h1>
            <p className="mt-2 text-forest-100">Every plot is 800m² of planned residential land, sold as a heritable Right of Use. See the <Link href="/terms" className="underline font-semibold text-white">Terms and Conditions of Sale</Link>.</p>
          </div>
          <Link href="/projects/river-edge#map" className="btn-accent">View on Interactive Map</Link>
        </div>
      </section>

      <section className="py-10 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl bg-sunset-500/10 border border-sunset-500/30 p-4 mb-8 text-sm text-gray-800 flex flex-wrap gap-x-6 gap-y-1">
            <span>🔥 <strong>Promotional price R75,000</strong> until {dateFmt(project.promoEndsAt)} (full payment required)</span>
            <span>📈 Standard price R90,000 thereafter</span>
          </div>
          <PlotsBrowser plots={plots} standardPrice={project.standardPrice} promoEnds={dateFmt(project.promoEndsAt)} />
        </div>
      </section>
    </>
  );
}
