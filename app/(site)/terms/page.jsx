import Link from "next/link";
import { TRUST, sellerName, attorneyName } from "@/lib/contact";
import { getPortalSession } from "@/lib/auth";

export const metadata = {
  title: "Terms and Conditions of Sale",
  description:
    "Terms and Conditions of Sale for River Edge Rural Village, Portion 2 of Farm 970 — The Mheza Trust, Registration Number IT000099/2024(E).",
};
export const dynamic = "force-dynamic";

function buildClauses(seller, attorney, sellerDefinition) {
  return [
  {
    id: "1-introduction",
    n: "1",
    title: "INTRODUCTION",
    body: [
      "These Terms and Conditions govern the purchase of a plot and the Right of Use associated with that plot at River Edge Rural Village.",
      "By signing the Acknowledgement of Payment and Plot Allocation form, the Buyer confirms acceptance of and agrees to be bound by these Terms and Conditions.",
    ],
  },
  {
    id: "2-definitions",
    n: "2",
    title: "DEFINITIONS",
    list: [
      ["\u201CThe Trust\u201D", "The Mheza Trust, Registration Number IT000099/2024(E)."],
      ["\u201CThe Project\u201D", "River Edge Rural Village, Portion 2 of Farm 970, Buffalo City Metropolitan Municipality."],
      ["\u201CThe Property\u201D", "Portion 2 of Farm 970, measuring approximately 31.9 hectares."],
      ["\u201CPlot\u201D", "A demarcated residential erf within the Project."],
      ["\u201CBuyer\u201D", "The person purchasing a plot and acquiring the Right of Use."],
      ["\u201CRight of Use\u201D", "The heritable right to occupy and use a plot, subject to these Terms and Conditions and the Community Constitution."],
      ["\u201CCPA\u201D", "Communal Property Association."],
      ["\u201CCommunity Constitution\u201D", "The constitution governing the conduct of plot holders within the Project."],
      ["\u201CSeller\u201D", sellerDefinition],
    ],
  },
  {
    id: "3-nature",
    n: "3",
    title: "NATURE OF THE TRANSACTION",
    body: [
      <span key="3-1"><strong>3.1</strong> The Buyer acquires a <strong>Right of Use</strong> to a plot and not a title deed. Ownership of the Property remains with the Trust until such time as it is transferred to the CPA.</span>,
      <span key="3-2"><strong>3.2</strong> Upon full payment and compliance, the Buyer receives:</span>,
    ],
    bullets: [
      "A Certificate of Land Use;",
      "The right to occupy and use the plot for residential purposes;",
      "The right to build on the plot, subject to approval;",
      "The right to transfer the Right of Use, subject to Trust approval;",
      "The right to nominate beneficiaries.",
    ],
    body2: [<span key="3-3"><strong>3.3</strong> The Buyer does <strong>not</strong> receive:</span>],
    bullets2: [
      "A title deed;",
      "Ownership of the land;",
      "The right to subdivide the plot without approval;",
      "The right to use the plot for commercial or industrial purposes;",
      "The right to conduct animal farming or slaughtering on the plot.",
    ],
  },
  {
    id: "4-benefit",
    n: "4",
    title: "PROJECT-SPECIFIC BENEFIT",
    body: [
      "The rights conferred by these Terms and Conditions are limited to River Edge Rural Village only.",
      "Purchase of a plot in this Project does not confer automatic beneficiary status in any other Trust project. Separate participation is required for any other project.",
    ],
  },
  {
    id: "5-ring-fenced",
    n: "5",
    title: "RING-FENCED PROJECT",
    body: [
      `River Edge Rural Village is a distinct venture between the Trust and ${seller}.`,
      "The Property is Portion 2 of Farm 970, Cove Ridge East, Buffalo City Metropolitan Municipality, measuring approximately 31.9 hectares.",
      `The sale is facilitated by ${attorney}. The title deed is held by the Trust.`,
      "No claims arising from other Trust projects may be brought against this Project, and no claims arising from this Project may be brought against other Trust projects.",
    ],
  },
  {
    id: "6-payment",
    n: "6",
    title: "PLOT PURCHASE AND PAYMENT",
    body: [
      <span key="6-1"><strong>6.1</strong> The promotional price is <strong>R75,000</strong> per 800 m² plot, valid until <strong>30 November 2026</strong>. The standard price thereafter is <strong>R90,000</strong>. Prices are subject to change without notice.</span>,
      <span key="6-2"><strong>6.2</strong> Full payment qualifies the Buyer for the promotional price. Instalment plans are available on the standard price (details on request). A deposit may be required to reserve a plot.</span>,
      <span key="6-3"><strong>6.3</strong> Payment methods: electronic funds transfer (EFT), cash by arrangement, and such other methods as the Trust may determine.</span>,
      <span key="6-4"><strong>6.4</strong> Banking details appear on the Trust Information page. The payment reference must be in the format <strong>Plot Number – Buyer Name</strong>.</span>,
      <span key="6-5"><strong>6.5</strong> Late payments attract interest at <strong>2% per month</strong>. Persistent late payment may result in suspension or forfeiture of the Right of Use.</span>,
      <span key="6-6"><strong>6.6</strong> The following steps apply where payment is not made when due:</span>,
    ],
    table: [
      ["1 month missed", "Reminder SMS"],
      ["2 months missed", "Formal letter"],
      ["3 months missed", "Telephone call"],
      ["4 months missed", "Meeting with the Chairperson"],
      ["6 months missed", "Suspension of rights"],
      ["12 months missed", "Forfeiture of plot"],
    ],
  },
  {
    id: "7-certificate",
    n: "7",
    title: "RIGHT OF USE CERTIFICATE",
    body: [
      "The Certificate of Land Use is issued on full payment and compliance with these Terms and Conditions.",
      "The certificate contains the plot number, plot size, Buyer name and ID number, beneficiary details, these Terms and Conditions, and the Trust stamp and signatures.",
      "The Right of Use is heritable and transferable, subject to Trust approval, payment of the transfer fee, and the new holder accepting these Terms and Conditions and the Community Constitution.",
      "The transfer fee is 5% of the sale price or R5,000, whichever is greater. No transfer fee is payable on inheritance.",
    ],
  },
  {
    id: "8-beneficiary",
    n: "8",
    title: "BENEFICIARY NOMINATION",
    body: [
      "The Buyer may nominate beneficiaries to the Right of Use.",
      "The Buyer may update the nomination at any time by completing and signing a new beneficiary nomination form.",
      "On the death of the Buyer, the Right of Use passes to the nominated beneficiaries, who must provide a death certificate and accept these Terms and Conditions.",
    ],
  },
  {
    id: "9-constitution",
    n: "9",
    title: "COMMUNITY CONSTITUTION",
    body: ["The Community Constitution is binding on every plot holder. Its key rules are:"],
    bullets: [
      "Residential use only;",
      "No animal farming;",
      "No slaughtering;",
      "No commercial or industrial activity;",
      "No alcohol or drug businesses;",
      "Events require prior permission and must end by 22:00;",
      "Building plans require approval;",
      "Annual levies are payable.",
    ],
    body2: [
      "The CPA Committee enforces the Community Constitution. Breaches may result in fines, suspension or forfeiture of the Right of Use.",
    ],
  },
  {
    id: "10-building",
    n: "10",
    title: "BUILDING AND DEVELOPMENT",
    body: [
      "CPA Committee approval is required before construction begins.",
      "All building work must comply with SABS 0400, the National Building Regulations, the Architectural Guidelines and Municipal By-Laws.",
    ],
    table: [
      ["Front setback", "5 m"],
      ["Side setback", "2 m"],
      ["Rear setback", "3 m"],
    ],
    body2: [
      "Building must commence within 12 months of allocation and be completed within 24 months.",
    ],
  },
  {
    id: "11-infrastructure",
    n: "11",
    title: "INFRASTRUCTURE",
    bullets: [
      "Rainwater harvesting is the primary water source; a minimum 5,000-litre tank is required;",
      "Septic tanks of a minimum 2,500 litres, serviced yearly by a registered private provider;",
      "Eskom electricity is available and the Buyer arranges the connection;",
      "Internal roads are 6–11 m wide; no pipelines may be laid under the roads.",
    ],
  },
  {
    id: "12-levies",
    n: "12",
    title: "ANNUAL LEVIES",
    body: [
      "Annual levies are payable to the CPA as determined from time to time.",
      "Levies cover common-area maintenance, CPA administration, CSOS fees, insurance and community projects.",
      "Non-payment may result in suspension of rights or legal action.",
    ],
  },
  {
    id: "13-privacy",
    n: "13",
    title: "PRIVACY AND DATA PROTECTION",
    body: [
      "The Trust collects personal information for the purposes of administering plot purchases, the Right of Use and the Community Constitution.",
      "Personal information is used to process purchases and payments, to communicate with the Buyer, to comply with legal obligations, and — with the Buyer's consent — for marketing.",
      "The Trust applies reasonable security measures to protect personal information. No system is completely secure.",
      "Personal information is not sold or shared, except as required by law or with the Buyer's consent.",
      "The Buyer has the right to access and to request correction of their personal information.",
    ],
  },
  {
    id: "14-liability",
    n: "14",
    title: "LIMITATION OF LIABILITY",
    body: [
      "The plot is sold \u201Cas is\u201D and no warranties are given.",
      "The Trust is not liable for indirect, incidental, special or consequential damages.",
      "The Trust is not liable for failure to perform arising from force majeure.",
    ],
  },
  {
    id: "15-indemnity",
    n: "15",
    title: "INDEMNITY",
    body: ["The Buyer indemnifies the Trust, its trustees, employees and agents against claims arising from the Buyer's use of the plot or breach of these Terms and Conditions."],
  },
  {
    id: "16-disputes",
    n: "16",
    title: "DISPUTE RESOLUTION",
    body: [
      "Disputes are first referred to mediation by the CPA Committee.",
      "If mediation fails, the dispute is referred to CSOS adjudication.",
      "Approach to a court of law is a last resort.",
    ],
  },
  {
    id: "17-amendments",
    n: "17",
    title: "AMENDMENTS",
    body: [
      "The Trust may amend these Terms and Conditions.",
      "Amendments are communicated by email and published on this website.",
      "Continued use of the plot constitutes acceptance of the amended Terms and Conditions.",
    ],
  },
  {
    id: "18-termination",
    n: "18",
    title: "TERMINATION",
    body: [
      "The Trust may terminate the Right of Use for material breach of these Terms and Conditions, breach of the Community Constitution, non-payment of levies, criminal activity, or abandonment of the plot for 12 months or longer.",
      "The Buyer may terminate by transferring the Right of Use, subject to Trust approval.",
      "On termination the Buyer must vacate the plot and remove their belongings.",
    ],
  },
  {
    id: "19-law",
    n: "19",
    title: "GOVERNING LAW",
    body: ["These Terms and Conditions are governed by the laws of the Republic of South Africa."],
  },
  {
    id: "20-contact",
    n: "20",
    title: "CONTACT US",
    contact: true,
  },
  {
    id: "21-acknowledgement",
    n: "21",
    title: "ACKNOWLEDGEMENT",
    body: ["By signing the Acknowledgement of Payment and Plot Allocation form, the Buyer acknowledges that they:"],
    bullets: [
      "have read and understood these Terms and Conditions;",
      "accept that they acquire a Right of Use and not a title deed;",
      "agree to be bound by the Community Constitution;",
      "understand the payment terms;",
      "understand the rules relating to animal farming, slaughtering and commercial activity;",
      "accept the dispute resolution process; and",
      "consent to the collection and use of their personal information.",
    ],
  },
];
}

function Clause({ c }) {
  return (
    <section id={c.id} className="scroll-mt-24 border-b border-gray-200 py-7 last:border-0">
      <h2 className="text-lg font-bold text-forest-900">
        <span className="text-earth-500 mr-2">{c.n}.</span>
        {c.title}
      </h2>

      {c.contact ? (
        <div className="mt-3 rounded-lg bg-earth-50 border border-earth-200 p-5 text-sm text-gray-700 space-y-1.5">
          <p className="font-bold text-forest-900">{TRUST.legalName}</p>
          <p>
            <span className="text-gray-500">Phone:</span>{" "}
            {TRUST.phones.map((p, i) => (
              <span key={p}>
                {i > 0 && " / "}
                <a href={`tel:+27${p.slice(1).replace(/\s/g, "")}`} className="text-forest-700 hover:underline">{p}</a>
              </span>
            ))}
          </p>
          <p>
            <span className="text-gray-500">Email:</span>{" "}
            <a href={`mailto:${TRUST.email}`} className="text-forest-700 hover:underline">{TRUST.email}</a>
          </p>
          <p><span className="text-gray-500">Registration Number:</span> {TRUST.registrationNumber}</p>
        </div>
      ) : (
        <div className="mt-3 space-y-3 text-sm text-gray-700 leading-relaxed">
          {c.body?.map((p, i) => <p key={i}>{p}</p>)}
          {c.list && (
            <dl className="divide-y divide-gray-100 rounded-lg border border-gray-200">
              {c.list.map(([term, def]) => (
                <div key={term} className="grid sm:grid-cols-3 gap-1 px-4 py-2.5">
                  <dt className="font-semibold text-forest-900">{term}</dt>
                  <dd className="sm:col-span-2">{def}</dd>
                </div>
              ))}
            </dl>
          )}
          {c.bullets && (
            <ul className="ml-5 list-disc space-y-1.5">
              {c.bullets.map((b) => <li key={b}>{b}</li>)}
            </ul>
          )}
          {c.table && (
            <table className="w-full max-w-md border-collapse text-sm">
              <tbody>
                {c.table.map(([k, v]) => (
                  <tr key={k} className="border-b border-gray-100">
                    <th scope="row" className="bg-gray-50 px-4 py-2 text-left font-semibold text-gray-900 w-1/2">{k}</th>
                    <td className="px-4 py-2 text-gray-700">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {c.body2?.map((p, i) => <p key={i}>{p}</p>)}
          {c.bullets2 && (
            <ul className="ml-5 list-disc space-y-1.5">
              {c.bullets2.map((b) => <li key={b}>{b}</li>)}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

export default async function TermsPage() {
  const isMember = !!(await getPortalSession());
  const CLAUSES = buildClauses(
    sellerName(isMember),
    attorneyName(isMember),
    isMember
      ? `${TRUST.seller}, the original owner of the Property.`
      : "The original owner of the Property (name available to registered members).",
  );
  return (
    <>
      <section className="bg-forest-800 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-forest-300 mb-2">Public Information</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Terms and Conditions of Sale</h1>
          <p className="mt-3 text-forest-100 max-w-3xl">
            River Edge Rural Village – Portion 2 of Farm 970 · {TRUST.legalName} (Registration Number: {TRUST.registrationNumber})
          </p>
          <p className="mt-2 text-sm text-forest-300">
            Project: River Edge Rural Village · Effective Date: April 2025 · Last Updated: 24 September 2026
          </p>
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid gap-10 lg:grid-cols-4">
          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-24">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">Contents</h2>
              <ol className="space-y-1 text-sm">
                {CLAUSES.map((c) => (
                  <li key={c.id}>
                    <a href={`#${c.id}`} className="block rounded px-2 py-1 text-gray-600 hover:bg-forest-50 hover:text-forest-800">
                      <span className="text-earth-500 mr-1.5">{c.n}.</span>{c.title}
                    </a>
                  </li>
                ))}
              </ol>
              <div className="mt-6 space-y-2">
                <Link href="/trust-info" className="btn-outline btn-sm w-full">Trust Information & Banking</Link>
                <Link href="/login" className="btn-primary btn-sm w-full">Member Login</Link>
              </div>
            </div>
          </aside>

          <article className="lg:col-span-3">
            <div className="rounded-xl bg-sunset-500/10 border border-sunset-500/30 p-4 mb-8 text-sm text-gray-800">
              <strong>Please read these Terms and Conditions carefully.</strong> A plot at River Edge Rural Village conveys a
              heritable <strong>Right of Use</strong>, not a title deed or land ownership. Signing the Acknowledgement of Payment
              and Plot Allocation form binds you to every clause below and to the Community Constitution.
            </div>
            {CLAUSES.map((c) => <Clause key={c.id} c={c} />)}
          </article>
        </div>
      </section>
    </>
  );
}
