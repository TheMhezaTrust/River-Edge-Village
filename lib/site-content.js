import { prisma } from "./prisma.js";

// Editable public text blocks, grouped by page. Each key maps to a single
// string rendered on the public site. Defaults mirror the shipped copy so the
// site is unchanged until an administrator edits a value in the dashboard.
export const CONTENT_FIELDS = [
  {
    group: "Homepage",
    key: "home.heroTitle",
    label: "Hero title",
    help: "Large headline in the hero banner.",
    multiline: false,
    default: "River Edge Rural Village",
  },
  {
    group: "Homepage",
    key: "home.heroTagline",
    label: "Hero tagline",
    help: "Line shown under the hero title.",
    multiline: false,
    default: "Your Piece of Land. Your Home. Your Future.",
  },
  {
    group: "Homepage",
    key: "home.trustSubtitle",
    label: "Trust Information subtitle",
    help: "Subtitle above the Trust Information table.",
    multiline: false,
    default: "The basics, verifiable and on the record.",
  },
  {
    group: "Homepage",
    key: "home.tncSubtitle",
    label: "Terms & Conditions subtitle",
    help: "Subtitle in the Terms and Conditions band.",
    multiline: true,
    default:
      "Published in full — covering the trust and beneficiary structure, title and ownership, permitted use and restrictions, off-grid infrastructure and services, enforcement, and general provisions.",
  },
  {
    group: "Homepage",
    key: "home.pricingNote",
    label: "Pricing note",
    help: "Small print under the 'Pricing at a glance' card.",
    multiline: true,
    default: "Prices are subject to change without notice — see clause 6 of the Terms and Conditions.",
  },
  {
    group: "Homepage",
    key: "home.progressSubtitle",
    label: "Project Progress — section subtitle",
    help: "Homepage 'Project Progress' section intro line, shown above the milestone cards.",
    multiline: true,
    default:
      "Milestones and public announcements. Members see the same progress inside the portal alongside their own payments.",
  },
  {
    group: "About Us",
    key: "about.heroTitle",
    label: "About hero title",
    multiline: false,
    default: "The Mheza Trust — Legal Owner, Honest Steward",
  },
  {
    group: "About Us",
    key: "about.heroSubtitle",
    label: "About hero subtitle",
    multiline: true,
    default:
      "A registered trust holding land in trust for South African families, developing it legally, transparently, and permanently.",
  },
  {
    group: "About Us",
    key: "about.mission",
    label: "Our Mission",
    multiline: true,
    default:
      "To deliver legal, planned, and affordable rural land ownership to South African families through transparent trust governance and full regulatory compliance.",
  },
  {
    group: "About Us",
    key: "about.vision",
    label: "Our Vision",
    multiline: true,
    default:
      "Rural communities across South Africa that are secure, serviced, self-governing, and proud — a replicable model starting at River Edge.",
  },
  {
    group: "Projects",
    key: "project.heroBadge",
    label: "Project hero badge",
    help: "Status line beside the pill on the project page hero.",
    multiline: false,
    default: "Application for Rezoning to Residential Zoning 4 (Townhouse)",
  },
  {
    group: "Projects",
    key: "project.overviewTitle",
    label: "Project overview heading",
    multiline: false,
    default: "A Planned Community on Titled Land",
  },
  {
    group: "Projects",
    key: "project.subdivisionText",
    label: "How the Land Is Divided — 'Subdivision' card",
    help: "Project page, 'How the Land Is Subdivided' section: the first card (Subdivision).",
    multiline: true,
    default:
      "An application for Rezoning to Residential Zoning 4 (Townhouse) is being prepared for submission to BCMM.",
  },
  {
    group: "Projects",
    key: "project.roadsText",
    label: "How the Land Is Divided — 'Road network' card",
    help: "Project page, 'How the Land Is Subdivided' section: the second card (Road network).",
    multiline: true,
    default:
      "Blocks are separated by 9–11m primary road reserves with internal 6m secondary roads between plot rows — every plot has direct road frontage and emergency access.",
  },
  {
    group: "Projects",
    key: "project.greenSpacesText",
    label: "How the Land Is Divided — 'Green spaces' card",
    help: "Project page, 'How the Land Is Subdivided' section: the third card (Green spaces).",
    multiline: true,
    default:
      "Green belts are set aside within the village, and both dam areas are protected with compliant setbacks and wetland buffers, giving the village communal open space.",
  },
  {
    group: "Farm Location",
    key: "contact.mapEmbed",
    label: "Farm Location — Google Map",
    help: "Paste a Google Maps embed code (Share → Embed a map), a Google Maps link, or a plain address / 'lat,lng'. The contact page renders it as an interactive map. Leave blank to hide the map.",
    multiline: true,
    default: "-32.8,27.9",
  },
  {
    group: "Farm Location",
    key: "contact.mapCaption",
    label: "Farm Location — caption",
    help: "Small text shown under the map on the contact page.",
    multiline: false,
    default:
      "Approximate location: Cove Ridge East, Buffalo City. Exact farm entrance coordinates shared when booking a viewing.",
  },
  {
    group: "Terms & Conditions",
    key: "terms.body",
    label: "Terms and Conditions — full text",
    help: "The complete Terms and Conditions of Sale shown on the public /terms page. Plain text — line breaks and clause numbering are preserved exactly as typed. Edit here whenever the terms change; no developer needed.",
    multiline: true,
    default: `TERMS AND CONDITIONS OF SALE – RIVER EDGE DEVELOPMENT
Portion 2 of Farm 970, East London, Eastern Cape, South Africa
The Mheza Trust (Registration Number: IT000099/2024(E))

Definitions

The Trust: The Mheza Trust, Registration Number IT000099/2024(E).

The Buyer: The individual or entity purchasing the Plot.

The Plot: The specific portion of land being purchased at Portion 2 of Farm 970, East London, known as "River Edge".

The Project: The specific development project known as "River Edge" at Portion 2 of Farm 970.

The Agreement: This Terms and Conditions document and the accompanying Sale Agreement.

Nature of the Agreement & Acknowledgement of Trust Structure
2.1. The Buyer is purchasing a Plot within the "River Edge" Project, administered by The Mheza Trust.
2.2. The Buyer explicitly acknowledges that The Mheza Trust administers multiple, separate projects (each a "Project"), each with its own distinct assets, rules, financial structures, and benefits.
2.3. This Agreement pertains only to the "River Edge" Project. The transaction for this Project is an arrangement solely between The Trust and the owner of Farm 970. The Buyer is acquiring only the rights and assets specifically advertised and offered for this Project.
2.4. By purchasing this Plot, the Buyer will be registered as a Beneficiary of The Mheza Trust, but only in respect of the specific Plot purchased within this Project.
2.5. Beneficiary rights are strictly limited to the asset(s) held within each specific Project. The Buyer shall have no claim, right, or entitlement to the assets, benefits, or distributions of any other Project administered by The Trust, unless they have separately purchased an asset within that other Project.

Title, Ownership, and Transfer
3.1. The Trust is and will remain the registered title holder of the entire Farm 970. No individual Title Deeds will be issued to Buyers for their Plots.
3.2. The Buyer's ownership is represented by their registration as a Beneficiary of The Trust for the specific Plot. Proof of ownership is a Certificate of Beneficial Interest issued by The Trust, subject to full payment.
3.3. The Buyer may not resell, cede, or transfer their Plot or Beneficial Interest without the prior written consent of The Trust. Any transfer must be processed and registered by The Trust, and a transfer fee, as determined by The Trust, will be payable.

Permitted Use and Restrictions
4.1. The Plot is sold for residential purposes only, subject to the building standards and architectural guidelines to be provided by The Trust.
4.2. The following are strictly prohibited:

a) Any form of animal farming (commercial or subsistence).

b) Any business involving the manufacture, distribution, or sale of alcohol.

c) Any illegal activities, including the use, manufacture, or distribution of illicit drugs or substances.
4.3. The Buyer agrees to comply with all conduct rules, including a noise curfew whereby all events must cease by 22:00 Complaints must first be submitted to the elected Residential Committee before escalation to The Trust.

Infrastructure and Services
5.1. The Buyer acknowledges that the Project does not utilize municipal water or sewage services.
5.2. The Buyer is solely responsible for the cost of installing and maintaining their own off-grid services, including but not limited to: A septic tank compliant with SANS 10400. A borehole, rainwater tanks, or other water source, subject to the National Water Act (No. 36 of 1998). An electricity connection from Eskom or a licensed alternative provider.
5.3. The Trust will be responsible for the overall maintenance of common areas and will appoint a service provider for garbage disposal, the cost of which will be shared by all beneficiaries via a levy.
5.4. The Project will have perimeter security and access control.

Enforcement and Consequences of Breach
6.1. Should the Buyer breach any material term of this Agreement (including but not limited to the restrictions in Clause 4 and 3.3), The Trust reserves the right, at its sole discretion, to:

a) Deregister the Buyer as a Beneficiary; and

b) Upon deregistration, refund the original purchase price paid for the Plot, less a 15% (fifteen percent) administration and penalty fee and any other costs incurred by The Trust, within 90 (ninety) days.
6.2. Upon such deregistration and refund, the Buyer will forfeit all rights to the Plot and any services provided by The Trust.

General Provisions
7.1. Voetstoots: The Plot is sold "as is" and The Trust gives no warranties, expressed or implied, regarding its suitability for any purpose.
7.2. Governing Law: This Agreement shall be governed by the laws of the Republic of South Africa.
7.3. Entire Agreement: This document constitutes the entire agreement between the parties.
7.4. Indemnity: The Buyer indemnifies The Trust against any claims arising from their use of the Plot.

BUYER'S ACCEPTANCE AND ACKNOWLEDGEMENT
By signing below, I, the Buyer, confirm that I have read, understood, and agreed to all the terms and conditions above. I explicitly acknowledge that:

I am purchasing a Beneficial Interest in a Plot within the "River Edge" Project only.

I hold no rights to any other projects run by The Mheza Trust.

No Title Deed will be issued in my name; The Trust remains the title holder.

I am responsible for my own off-grid water and sewage solutions.

I am bound by the strict prohibitions on animal farming, alcohol businesses, and illicit drugs.`,
  },
];

const DEFAULTS = Object.fromEntries(CONTENT_FIELDS.map((f) => [f.key, f.default]));

// Merges administrator overrides on top of the shipped defaults. Any database
// error (including a not-yet-created SiteContent table) falls back to defaults,
// so the public site keeps rendering even before the schema is applied.
export async function getSiteContent() {
  const values = { ...DEFAULTS };
  try {
    const rows = await prisma.siteContent.findMany();
    for (const row of rows) {
      if (row.key in DEFAULTS && row.value != null && row.value !== "") {
        values[row.key] = row.value;
      }
    }
  } catch {
    // fall back to defaults
  }
  return values;
}
