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
      "Published in full — 21 clauses covering everything from pricing and the non-payment ladder to building setbacks and dispute resolution.",
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
