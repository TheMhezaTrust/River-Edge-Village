import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SectionHeading } from "@/components/ui";
import { zar } from "@/lib/format";
import { TRUST, sellerName, attorneyName } from "@/lib/contact";
import { getPortalSession } from "@/lib/auth";

export const metadata = {
  title: "Trust Information",
  description: "Full details of The Mheza Trust: registration, trustees, deed summary, banking details and payment reference format.",
};
export const dynamic = "force-dynamic";

const TRUSTEES = [
  ["Bongani Sifiniza", "Trustee"],
  ["Lihle Jacob", "Trustee"],
  ["Sydney Velapi", "Trustee"],
  ["Sisanda Toni", "Trustee"],
  ["Sipho Jauka", "Trustee"],
];

export default async function TrustInfoPage() {
  const isMember = !!(await getPortalSession());
  const project = await prisma.project.findUnique({ where: { slug: "river-edge" } });

  return (
    <>
      <section className="bg-trust-500 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-200 mb-2">Governance & Legal</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">Trust Information</h1>
          <p className="mt-3 text-blue-100 max-w-2xl text-lg">Everything you need to verify who we are, how we govern, and how to transact safely with the Trust.</p>
        </div>
      </section>

      <section className="py-14 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-10">
            {/* Full trust details */}
            <div>
              <h2 className="text-2xl font-bold text-forest-900 mb-4">Full Trust Details</h2>
              <div className="card overflow-hidden">
                <table className="table-base">
                  <tbody>
                    {[
                      ["Trust name", "The Mheza Trust"],
                      ["Trust registration number", `${TRUST.registrationNumber} (Master of the High Court)`],
                      ["Registered as legal owner", "Portion 2 of Farm 970, Cove Ridge East, Buffalo City Metropolitan Municipality"],
                      ["Extent of land held", `31.9 hectares (residential plots of 800m²)`],
                      ["Original seller", sellerName(isMember, "Available to registered members")],
                      ["Trust attorney", attorneyName(isMember, "Available to registered members")],
                      ["Project administration", `All ${TRUST.legalName} projects are administered by ${TRUST.administrator}`],
                      ["Title deed", "Held by The Mheza Trust (copy available at the Trust office)"],
                      ["What a buyer acquires", "A heritable Right of Use — not a title deed. See the Terms and Conditions of Sale."],
                      ["CPA registration", "In progress with DALRRD"],
                      ["Governing framework", "Trust deed + Community Constitution pending CPA registration"],
                    ].map(([k, v]) => (
                      <tr key={k}>
                        <th className="w-1/3 bg-white border-b border-gray-100">{k}</th>
                        <td className="text-gray-700">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Trustees */}
            <div>
              <h2 className="text-2xl font-bold text-forest-900 mb-4">Trustees</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {TRUSTEES.map(([name, role]) => (
                  <div key={name} className="card p-5 flex items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-forest-100 text-forest-800 font-bold" aria-hidden>
                      {name.split(" ").map((n) => n[0]).join("")}
                    </span>
                    <div>
                      <p className="font-bold text-gray-900">{name}</p>
                      <p className="text-sm text-forest-700">{role}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm text-gray-500">Full trustee profiles are on the <Link href="/about" className="text-forest-700 underline">About Us page</Link>.</p>
            </div>

            {/* Trust deed summary */}
            <div>
              <h2 className="text-2xl font-bold text-forest-900 mb-4">Trust Deed Summary</h2>
              <div className="card p-6 text-sm text-gray-700 leading-relaxed space-y-3">
                <p>The Trust deed establishes The Mheza Trust as the legal owner of the development land, held <strong>in trust for the benefit of the community members and plot holders</strong> of River Edge Rural Village.</p>
                <p>Key provisions:</p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Trustees are appointed and removed in terms of the deed and the Trust Property Control Act.</li>
                  <li>The Trust may not sell the farm as a whole; land is released only to qualifying beneficiaries and plot holders.</li>
                  <li>Upon CPA registration with DALRRD, governance transitions to the democratically elected Communal Property Association structures.</li>
                  <li>The Master of the High Court oversees trustee accountability; members may request trust documents at the office.</li>
                </ul>
              </div>
            </div>

            {/* Role as legal owner */}
            <div>
              <h2 className="text-2xl font-bold text-forest-900 mb-4">The Trust's Role as Legal Owner</h2>
              <p className="text-gray-700 leading-relaxed">
                The Trust holds the title deed while the rezoning and subdivision processes complete. A buyer acquires a
                <strong> heritable Right of Use</strong> to a specific erf — not a title deed and not land ownership — recorded in the
                Trust register and visible in the member portal, together with a Certificate of Land Use on full payment. Ownership
                remains with the Trust until it is transferred to the CPA. This structure protects the land from
                fragmentation or speculative resale while the community is being established.
              </p>
              <Link href="/terms" className="btn-outline btn-sm mt-4">Read the Terms and Conditions of Sale →</Link>
            </div>
          </div>

          {/* Sidebar: banking + contact */}
          <aside className="space-y-6">
            <div className="card p-6 border-2 border-forest-200">
              <h3 className="font-bold text-forest-900 text-lg mb-4">🏦 Official Banking Details</h3>
              <dl className="space-y-3 text-sm">
                {[["Bank", "Absa"], ["Account name", "River Edge SA Primary Co-operative Ltd"], ["Registration number", "202500243224"], ["Account number", "4121013447"], ["Branch code", "632005"], ["Account type", "Current"]].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b border-gray-100 pb-2">
                    <dt className="text-gray-500">{k}</dt>
                    <dd className="font-semibold text-gray-900 font-mono">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 rounded-lg bg-sunset-500/10 border border-sunset-500/30 p-3 text-sm">
                <p className="font-bold text-gray-900">⚠️ Mandatory payment reference</p>
                <p className="mt-1 text-gray-700 font-mono text-xs">{"{plot number} – {buyer name}"}</p>
                <p className="mt-2 text-xs text-gray-500">Use the format set out in clause 6.4 of the Terms and Conditions of Sale (e.g. <span className="font-mono">12 – Your Full Name</span>). Payments without the correct reference cannot be allocated and will delay your receipt.</p>
              </div>
              <p className="mt-4 text-xs text-gray-500">
                Never deposit cash. The Trust will never ask for payment to a personal account. Verify details by phone before paying.
              </p>
            </div>

            <div className="card p-6">
              <h3 className="font-bold text-forest-900 text-lg mb-4">📞 Contact</h3>
              <ul className="space-y-3 text-sm text-gray-700">
                <li><span className="block text-gray-500 text-xs font-semibold uppercase">Phone</span>{TRUST.phones.map((p) => (
                  <a key={p} href={`tel:+27${p.slice(1).replace(/\s/g, "")}`} className="block text-forest-700 hover:underline font-medium">{p}</a>
                ))}</li>
                <li><span className="block text-gray-500 text-xs font-semibold uppercase">Email</span><a href="mailto:themhezatrust@gmail.com" className="text-forest-700 hover:underline font-medium">themhezatrust@gmail.com</a></li>
                <li><span className="block text-gray-500 text-xs font-semibold uppercase">Website</span><a href={TRUST.siteUrl} className="text-forest-700 hover:underline font-medium">{TRUST.website}</a></li>
                <li><span className="block text-gray-500 text-xs font-semibold uppercase">Physical address</span>Cove Ridge East, Buffalo City, Eastern Cape</li>
              </ul>
              <Link href="/contact" className="btn-primary btn-sm w-full mt-5">Contact Us</Link>
            </div>

            <div className="card p-6 bg-earth-50 border-earth-200">
              <h3 className="font-bold text-forest-900 mb-2">Pricing reminder</h3>
              <p className="text-sm text-gray-600">
                Plots are {zar(project?.promoPrice)} (promotional, full payment) until {project?.promoEndsAt}, then {zar(project?.standardPrice)}.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
