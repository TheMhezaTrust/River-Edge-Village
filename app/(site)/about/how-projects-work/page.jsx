import Link from "next/link";
import { SectionHeading } from "@/components/ui";
import { BackboneDiagram, ExampleFlow } from "@/components/site/backbone";

export const metadata = {
  title: "How Our Projects Work – The Mheza Trust Backbone",
  description:
    "Learn how The Mheza Trust designs projects with two separate contracts—one for investors and one for customers—protected by a spinal cord routing system. Understand Project 1 and Project 2 with clear diagrams. Example amounts used for illustration only.",
  keywords: [
    "The Mheza Trust",
    "project backbone",
    "investor contract",
    "customer contract",
    "community land ownership",
    "River Edge Rural Village",
    "CPA",
    "communal property association",
    "compliance",
  ],
};

const EXAMPLE_NOTE =
  "All amounts shown on this page are examples for illustration only. Actual amounts are specified in individual contracts.";

const PROTECTIONS = [
  [
    "“We are all beneficiaries, so I should get what they get.”",
    "No. Your rights are defined by your contract. Investor and Customer have different contracts.",
  ],
  [
    "“The Trust has money, so it must belong to us.”",
    "No. The Trust holds money for different purposes. Investor money is for investor returns. Customer money is for plots. The Trust's fee is for survival.",
  ],
  [
    "“I want to see where my money went.”",
    "Look at your contract. It tells you exactly what you are entitled to and what you are not.",
  ],
  [
    "“Why can't I build now?”",
    "You cannot build without complying first. Compliance means rezoning, building approvals, CPA registration, and all legal requirements must be in place.",
  ],
  [
    "“The Trust is keeping all the money.”",
    "The Trust's operating fee is defined in Contract C. It is not keeping anything beyond what the contract allows.",
  ],
];

const FAQ = [
  [
    "I am a beneficiary. Why can't I get what the investor gets?",
    "You are a beneficiary of the Trust, but your rights are defined by your contract. If you signed Contract B (Customer), you are entitled to a plot. If you signed Contract A (Investor), you are entitled to a return. These are different contracts with different rights.",
  ],
  [
    "Why doesn't all the money in the Trust belong to me?",
    "The Trust holds money for different purposes. Investor money is for investor returns. Customer money is for plots. The Trust's operating fee is for survival—tax, accountant, attorney, change of ownership, rezoning, and paying the companies that facilitate the projects.",
  ],
  [
    "Why can't I build my house yet?",
    "You cannot build without complying first. Compliance means rezoning, building approvals, CPA registration, and all legal requirements must be in place. This is for your protection.",
  ],
  [
    "How do I know what I am entitled to?",
    "Read your contract. It defines exactly what you are entitled to and what you are not.",
  ],
  [
    "Who owns the roads and free spaces?",
    "The community owns them through the CPA. They are not owned by any individual. They are for everyone's use.",
  ],
];

export default function HowProjectsWorkPage() {
  return (
    <>
      {/* Section 1 — Introduction */}
      <section className="bg-forest-800 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-forest-300 mb-2">About Us</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight max-w-4xl">
            How Our Projects Work – The Mheza Trust Backbone
          </h1>
          <div className="mt-6 max-w-3xl space-y-4 text-lg text-forest-100 leading-relaxed">
            <p>
              Every project by The Mheza Trust follows the same backbone. Think of the human body. The brain sends
              signals down the spinal cord to different parts of the body. Each side receives its own signal based on
              how it is wired.
            </p>
            <p className="font-semibold text-white">The Mheza Trust works the same way.</p>
            <p>
              The Trust is the brain. It researches opportunities, designs the project, and creates two separate
              contracts.
            </p>
            <p>
              The spinal cord holds all assets and routes every signal based on which contract it came from. This
              protects everyone from being abused by the other side.
            </p>
            <p>
              The left side is the Investor. This is the person or entity that brings a large asset—cash or land—and
              expects a return based on their contract.
            </p>
            <p>
              The right side is the Customer. This is the person who brings money to buy a plot and expects a plot
              based on their contract.
            </p>
            <p>
              Both sides are beneficiaries of the same Trust. But their rights are different because their contracts
              are different. This is what protects each side from the other.
            </p>
          </div>
          <p className="mt-8 inline-block max-w-3xl rounded-xl border border-sunset-400/60 bg-sunset-500/15 px-4 py-3 text-sm font-medium text-orange-100">
            <strong className="font-bold text-white">Note:</strong> {EXAMPLE_NOTE}
          </p>
        </div>
      </section>

      {/* Section 2 — The diagram */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="The Backbone"
            title="The Mheza Trust Backbone – Visual Diagram"
            subtitle="Hover over (or tab to) any part of the diagram for more detail. Animated arrows show commands flowing down and signals flowing back up."
          />
          <BackboneDiagram />
        </div>
      </section>

      {/* Section 3 — Project 1 example */}
      <section className="py-16 bg-earth-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading center={false} eyebrow="Worked Example" title="Example – Project 1 (Cash Investor + Plot Buyer)" />
          <div className="max-w-3xl space-y-4 text-gray-700 leading-relaxed">
            <p>
              In Project 1, the Trust invited investors to bring a small amount of money (for example, R50 each). The
              Trust used this money to buy land and subdivide it.
            </p>
            <p>
              Each investor received two plots. They could keep one plot and sell the second plot to a customer for
              market value (for example, R200).
            </p>
            <p>
              From that R200, the investor receives R150. The Trust receives R50 to keep the Trust running.
            </p>
          </div>
          <div className="mt-10">
            <ExampleFlow
              brainTitle="Designs Project 1"
              brainBullets={["Investors bring cash", "Buy land, subdivide", "Each gets 2 plots"]}
              investor={{
                brings: "R50 (example)",
                gets: ["Plot 1", "R150 return (example)", "Plot 2"],
                notGets: ["Customer's R200", "Trust fee"],
              }}
              customer={{
                brings: "R200 (example)",
                gets: ["Plot", "Right of Use", "Certificate"],
                notGets: ["Investor's R150 return", "Trust fee"],
              }}
            />
          </div>
          <p className="mt-6 text-xs text-gray-500">{EXAMPLE_NOTE}</p>
        </div>
      </section>

      {/* Section 4 — Project 2 example */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading center={false} eyebrow="Worked Example" title="Example – Project 2 (Land Investor + Plot Buyer)" />
          <div className="max-w-3xl space-y-4 text-gray-700 leading-relaxed">
            <p>
              In Project 2, the investor is the farm owner. He brings land instead of cash. He wants to get more value
              than selling the farm on the open market.
            </p>
            <p>
              The Trust designed the project so that the farm owner receives an initial payment (for example, R200).
              After the change of ownership, he receives additional money from plot sales.
            </p>
            <p>
              The customers buy plots at an example price of R200. Each customer gets a plot with a Right of Use,
              Certificate of Land Use, rezoning, change of ownership, and CPA registration included.
            </p>
            <p>
              The roads, free spaces, slopes, dam, and common areas belong to the community through the CPA.
            </p>
          </div>
          <div className="mt-10">
            <ExampleFlow
              brainTitle="Designs Project 2"
              brainBullets={[
                "Investor: Farmer",
                "Asset: Land",
                "Customers: Plot Buyers",
                "Only part of land usable for plots",
                "Rest = roads, free spaces, slopes",
              ]}
              investor={{
                brings: "Land",
                gets: ["R200 initial (example)", "Additional money from sales after change of ownership"],
                notGets: ["Land back", "Customer plots", "Trust fee", "Roads, free spaces"],
              }}
              customer={{
                brings: "R200 (example)",
                gets: ["Plot", "Right of Use", "Certificate", "Rezoning", "Change of ownership", "CPA reg."],
                notGets: ["R200", "Additional sales money", "Trust fee", "Other plots"],
              }}
              community={["Roads", "Free spaces", "Slopes", "Dam", "Common areas"]}
            />
          </div>
          <p className="mt-6 text-xs text-gray-500">{EXAMPLE_NOTE}</p>
        </div>
      </section>

      {/* Section 5 — Comparison table */}
      <section className="py-16 bg-earth-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading center={false} eyebrow="Side by Side" title="Investor vs Customer – What Each Side Gets" />
          <div className="card overflow-x-auto">
            <table className="table-base min-w-[640px]">
              <thead>
                <tr>
                  <th scope="col">Project</th>
                  <th scope="col">Side</th>
                  <th scope="col">Brings</th>
                  <th scope="col">Gets</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td rowSpan={2} className="font-semibold text-forest-900">Project 1</td>
                  <td className="font-medium text-[#2E7D32]">Investor</td>
                  <td>R50 (example)</td>
                  <td>Plot 1, R150 return (example), Plot 2 option</td>
                </tr>
                <tr>
                  <td className="font-medium text-[#E65100]">Customer</td>
                  <td>R200 (example)</td>
                  <td>Plot, Right of Use, Certificate</td>
                </tr>
                <tr>
                  <td rowSpan={2} className="font-semibold text-forest-900">Project 2</td>
                  <td className="font-medium text-[#2E7D32]">Investor</td>
                  <td>Land</td>
                  <td>R200 initial (example) + additional money from sales</td>
                </tr>
                <tr>
                  <td className="font-medium text-[#E65100]">Customer</td>
                  <td>R200 (example)</td>
                  <td>Plot, Right of Use, Certificate, Rezoning, Change of ownership, CPA registration</td>
                </tr>
                <tr>
                  <td className="font-semibold text-forest-900">Both projects</td>
                  <td className="font-medium text-[#00695C]">Community</td>
                  <td>—</td>
                  <td>Roads, free spaces, slopes, dam, common areas</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-gray-500">{EXAMPLE_NOTE}</p>
        </div>
      </section>

      {/* Section 6 — Why this model protects everyone */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading center={false} eyebrow="Protection" title="Why This Model Protects Everyone" />
          <div className="card overflow-x-auto">
            <table className="table-base min-w-[640px]">
              <thead>
                <tr>
                  <th scope="col">Problem</th>
                  <th scope="col">How the Backbone Solves It</th>
                </tr>
              </thead>
              <tbody>
                {PROTECTIONS.map(([problem, solution]) => (
                  <tr key={problem}>
                    <td className="font-medium text-gray-900">{problem}</td>
                    <td className="text-gray-700">{solution}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 7 — FAQ */}
      <section className="py-16 bg-earth-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Questions" title="Frequently Asked Questions" />
          <div className="space-y-4">
            {FAQ.map(([q, a]) => (
              <details key={q} className="card p-5 group">
                <summary className="flex items-center gap-3 cursor-pointer font-bold text-forest-900 list-none">
                  {q}
                  <span className="ml-auto text-gray-400 group-open:rotate-180 transition-transform" aria-hidden>▾</span>
                </summary>
                <p className="mt-3 text-sm text-gray-600 leading-relaxed pl-0">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Section 8 — Call to action */}
      <section className="py-16 bg-forest-800">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <SectionHeading light eyebrow="Your Protection" title="Read Your Contract" />
          <p className="text-forest-100 leading-relaxed">
            Your contract is your protection. It defines what you bring, what you get, and what you cannot claim. If
            you have any questions about your contract, please contact us.
          </p>
          <div className="mt-8">
            <Link href="/contact" className="btn-accent px-7 py-3">Contact Us</Link>
          </div>
        </div>
      </section>
    </>
  );
}
