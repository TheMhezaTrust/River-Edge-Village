import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SectionHeading, StatusPill } from "@/components/ui";
import AnnouncementsFeed from "@/components/site/AnnouncementsFeed";
import { TRUST, sellerName } from "@/lib/contact";
import { getPortalSession } from "@/lib/auth";

export const metadata = {
  title: "Project Status",
  description: "Project timeline and public announcements for River Edge Rural Village.",
};
export const dynamic = "force-dynamic";

const TIMELINE_ICONS = { COMPLETED: "✅", IN_PROGRESS: "🔄", PENDING: "⏳", ONGOING: "🔵" };

export default async function StatusPage() {
  const isMember = !!(await getPortalSession());
  const [announcements, project] = await Promise.all([
    prisma.announcement.findMany({ where: { audience: "PUBLIC" }, orderBy: { createdAt: "desc" } }),
    prisma.project.findUnique({ where: { slug: "river-edge" } }),
  ]);
  const timeline = project?.timeline ? JSON.parse(project.timeline) : [];

  return (
    <>
      <section className="bg-forest-800 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-forest-300 mb-2">Transparency Report</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">Project Status</h1>
          <p className="mt-3 text-forest-100 max-w-2xl text-lg">
            The project timeline and public announcements — so members and buyers always know where River Edge Rural Village stands.
          </p>
        </div>
      </section>

      {/* BCMM Zoning Status */}
      <section className="py-14 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-forest-200 bg-earth-50 p-6 md:p-10">
            <p className="text-sm font-semibold uppercase tracking-wider text-forest-600 mb-1">BCMM Zoning Status – River Edge Rural Village</p>
            <p className="text-sm text-gray-600"><strong>Current Status:</strong> Application for Rezoning to Residential Zoning 4 (Townhouse)</p>
            <p className="text-sm text-gray-600"><strong>Last Updated:</strong> 24 September 2026</p>

            <h2 className="mt-8 text-xl font-bold text-forest-900">Summary of Our Engagement with BCMM</h2>
            <p className="mt-3 text-gray-700 leading-relaxed">
              On 18 August 2026, The Mheza Trust and the River Edge Village Community Committee held a meeting with Mr Kershan Naidoo
              (City Planner: Land Use Management) and his team at the BCMM Offices in East London.
            </p>
            <p className="mt-3 text-gray-700 leading-relaxed">
              The purpose of the meeting was to present the River Edge Rural Village project, clarify the nature of the development, and
              seek guidance on the correct process for rezoning the property.
            </p>

            <h2 className="mt-8 text-xl font-bold text-forest-900">What BCMM Confirmed</h2>
            <ol className="mt-4 space-y-4">
              <li>
                <h3 className="font-semibold text-gray-900">1. Rezoning to Residential Zoning 4</h3>
                <p className="mt-1 text-sm text-gray-700 leading-relaxed">
                  Mr Naidoo confirmed that an application can be submitted and considered for the rezoning of Portion 2 of Farm 970 to
                  Residential Zoning 4 (Townhouse) for the River Edge Rural Village development.
                </p>
              </li>
              <li>
                <h3 className="font-semibold text-gray-900">2. Rural Classification</h3>
                <p className="mt-1 text-sm text-gray-700 leading-relaxed">
                  Mr Naidoo acknowledged the community&apos;s clarification regarding their use of the term &quot;rural.&quot; He confirmed that as
                  long as the community is referring specifically to the use of rainwater harvesting and septic tanks, and not to animal
                  farming or slaughtering, an application can be submitted and considered for rezoning.
                </p>
              </li>
              <li>
                <h3 className="font-semibold text-gray-900">3. Location Within the Urban Edge</h3>
                <p className="mt-1 text-sm text-gray-700 leading-relaxed">
                  Mr Naidoo noted that the farm does fall within the BCMM urban edge as identified in the Spatial Development Framework.
                </p>
              </li>
              <li>
                <h3 className="font-semibold text-gray-900">4. Procedural Rejection, Not Substantive</h3>
                <p className="mt-1 text-sm text-gray-700 leading-relaxed">
                  Mr Naidoo explained that the previous application was rejected for procedural reasons in terms of Section 74(c) of the
                  BCMM SPLUM By-Law. The application was not submitted in the format required for the application type identified in the
                  by-law. This was not a rejection of the project itself.
                </p>
              </li>
            </ol>

            <h2 className="mt-8 text-xl font-bold text-forest-900">Steps Required by BCMM</h2>
            <p className="mt-2 text-sm text-gray-700">Mr Naidoo outlined the following steps required before the rezoning can be finalised:</p>
            <ul className="mt-3 space-y-2 text-sm text-gray-700 list-disc pl-5">
              <li>Engage a town planner to formally submit the rezoning application.</li>
              <li>Pay the application fee and all other fees required in the process.</li>
              <li>Consult with the BCMM Water and Sanitation Departments prior to the submission of the application.</li>
              <li>The application will be published to allow neighbouring communities to raise objections, if any.</li>
              <li>The application will be circulated to other Municipal Development departments for comments pertaining to the development.</li>
            </ul>

            <h2 className="mt-8 text-xl font-bold text-forest-900">Fast-Tracking Advice from BCMM</h2>
            <p className="mt-2 text-sm text-gray-700">Mr Naidoo advised the community to:</p>
            <ul className="mt-3 space-y-2 text-sm text-gray-700 list-disc pl-5">
              <li>Contact the BCMM Water and Sanitation Departments regarding the development and their requirements.</li>
              <li>Sit down with them and explain the proposal face-to-face.</li>
              <li>Obtain their written responses.</li>
              <li>Ensure the town planner attaches all these responses to the formal application, together with proof of application fee payment.</li>
            </ul>

            <h2 className="mt-8 text-xl font-bold text-forest-900">What This Means</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="table-base">
                <thead><tr><th>Item</th><th>Status</th></tr></thead>
                <tbody>
                  <tr><td>Rezoning Approval</td><td>BCMM is prepared to consider an application for Residential Zoning 4</td></tr>
                  <tr><td>Previous Rejection</td><td>Procedural (Section 74(c)) – not a rejection of the project</td></tr>
                  <tr><td>Next Step</td><td>Engage a town planner and submit a formal application</td></tr>
                  <tr><td>Water and Sanitation</td><td>Must be consulted prior to submission</td></tr>
                  <tr><td>Public Participation</td><td>Application will be published for public comment</td></tr>
                  <tr><td>Departmental Circulation</td><td>Application will be circulated to other Municipal Development departments</td></tr>
                </tbody>
              </table>
            </div>

            <h2 className="mt-8 text-xl font-bold text-forest-900">Our Progress to Date</h2>
            <p className="mt-2 text-sm text-gray-700">The Mheza Trust and the River Edge Village Community have already:</p>
            <ul className="mt-3 space-y-2 text-sm text-gray-700 list-disc pl-5">
              <li>Purchased the land legally from {sellerName(isMember, "the original owner")}.</li>
              <li>Registered The Mheza Trust (Registration Number: IT000099/2024(E)).</li>
              <li>Drafted a Constitution for the River Edge Rural Village CPA.</li>
              <li>Elected a temporary committee.</li>
              <li>Engaged with DALRRD for CPA registration.</li>
              <li>Met with BCMM and received guidance on the rezoning process.</li>
              <li>Received a no-objection letter from the Sanitation Division for the proposed septic tank system.</li>
              <li>Engaged with the Waterworks Division and awaiting their signed response.</li>
            </ul>

            <h2 className="mt-8 text-xl font-bold text-forest-900">Next Steps</h2>
            <ol className="mt-3 space-y-2 text-sm text-gray-700 list-decimal pl-5">
              <li>Engage a registered town planner to prepare and submit the formal rezoning application.</li>
              <li>Consult with BCMM Water and Sanitation Departments and obtain their written responses.</li>
              <li>Pay the application fee and any other required fees.</li>
              <li>Submit the formal application with all supporting documents and departmental responses attached.</li>
              <li>Await publication and circulation for public comment and departmental review.</li>
            </ol>

            <h2 className="mt-8 text-xl font-bold text-forest-900">Important Note</h2>
            <p className="mt-3 text-sm text-gray-700 leading-relaxed">
              This status is based on the meeting held with BCMM on 18 August 2026 and the guidance provided by Mr Kershan Naidoo
              (City Planner: Land Use Management). The community remains committed to following the correct legal process and complying
              with all requirements set by BCMM and other relevant departments.
            </p>
            <p className="mt-3 text-sm text-gray-700 leading-relaxed">
              We will continue to update this page as we progress through the rezoning process.
            </p>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-14 bg-earth-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Journey" title="Project Timeline" />
          <ol className="relative max-w-3xl mx-auto border-l-2 border-forest-200 ml-4">
            {timeline.map((item) => (
              <li key={item.label} className="mb-6 ml-8 relative">
                <span className="absolute -left-[52px] flex h-10 w-10 items-center justify-center rounded-full bg-white border-2 border-forest-300 text-lg" aria-hidden>
                  {TIMELINE_ICONS[item.status] || "⏳"}
                </span>
                <div className="card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-gray-900">{item.label}</h3>
                    <StatusPill status={item.status} />
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Public announcements */}
      <section className="py-14 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SectionHeading center={false} eyebrow="News" title="Public Announcements" />
            <AnnouncementsFeed announcements={announcements} />
          </div>
          <aside className="space-y-6">
            <div className="card p-6 bg-forest-50 border-forest-200">
              <h3 className="font-bold text-forest-900 mb-2">👥 For Existing Buyers</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Plot holders can log in to the <strong>Member Portal</strong> to view their plot information, full payment history,
                outstanding balance, upload required documents (ID copies, beneficiary nomination forms, building plans), and download
                the Certificate of Land Use once issued.
              </p>
              <Link href="/login" className="btn-primary btn-sm mt-4">Member Login</Link>
            </div>
            <div className="card p-6">
              <h3 className="font-bold text-forest-900 mb-3">📞 Contact Us</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><strong>Phone:</strong> {TRUST.phones.map((p, i) => (
                  <span key={p}>{i > 0 && " / "}<a href={`tel:+27${p.slice(1).replace(/\s/g, "")}`} className="text-forest-700 hover:underline">{p}</a></span>
                ))}</li>
                <li><strong>Email:</strong> <a href="mailto:themhezatrust@gmail.com" className="text-forest-700 hover:underline">themhezatrust@gmail.com</a></li>
                <li><strong>Office:</strong> Cove Ridge East, Buffalo City, Eastern Cape</li>
                <li><strong>Hours:</strong> Mon–Fri 08:00–17:00 · Sat 09:00–13:00</li>
              </ul>
              <Link href="/contact" className="btn-outline btn-sm mt-4">Full Contact Page</Link>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
