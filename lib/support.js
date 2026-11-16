import { isAdminRole, isOwnerRole } from "./roles.js";

// The member support desk. A member picks one of three reasons from the portal, and
// that choice alone decides which department the ticket lands in and which staff are
// assigned to answer it.
//
// `department` is what the member is shown — deliberately an office, never a person.
// `assignees` are the staff accounts the ticket is routed to, matched on their sign-in
// email address because that is the one field the Trust controls and cannot duplicate.
//
// Nothing here imports Prisma. Note that `REASONS` itself is server-only in practice:
// it carries those sign-in addresses, so no client component imports it — the portal
// page passes `REASON_OPTIONS` down as a prop and the workstation imports
// `REASON_LABELS`, both of which are the map with the routing stripped out.
export const REASONS = {
  PLOT_SALES: {
    label: "Plot Sales & Viewing",
    department: "Plot Sales Office",
    assignees: ["lihle.jacob@themhezatrust.local", "sydney.velapi@themhezatrust.local"],
  },
  FINANCE: {
    label: "Finance & Payments",
    department: "Finance Office",
    assignees: [
      "sisanda.toni@themhezatrust.local",
      "thandile.sifiniza@themhezatrust.local",
      "nokuthula.gedle@themhezatrust.local",
    ],
  },
  TRUST_INFO: {
    label: "Trust & Rezoning Info",
    department: "Trust Administration",
    assignees: ["sipho.jauka@themhezatrust.local", "bongani.sifiniza@themhezatrust.local"],
  },
};

// Dropdown order, fixed to the order the reasons are listed in the portal.
export const REASON_OPTIONS = Object.entries(REASONS).map(([value, reason]) => ({
  value,
  label: reason.label,
}));

// Reason → label with the routing stripped out. The workstation inbox is a client
// component, and importing REASONS there would bundle every staff sign-in address
// into JavaScript a browser can read; this is the part of the map it actually needs.
export const REASON_LABELS = Object.fromEntries(
  Object.entries(REASONS).map(([value, reason]) => [value, reason.label])
);

const MIN_BODY = 2;
const MAX_BODY = 4000;

export function isReason(value) {
  return Object.prototype.hasOwnProperty.call(REASONS, value);
}

// Both directions of the thread — a member's first message and every follow-up, a
// member of staff's reply — go through this, so the limits cannot drift apart.
export function normalizeMessage(body) {
  const text = typeof body === "string" ? body.trim() : "";
  if (text.length < MIN_BODY) return { body: "", error: "Please write your message before sending." };
  if (text.length > MAX_BODY) {
    return { body: "", error: `That message is too long. Please keep it under ${MAX_BODY} characters.` };
  }
  return { body: text, error: null };
}

// An administrator reads every ticket, and so does the software owner, whose role is
// to audit the whole system. Everybody else — the finance and plot staff the routing
// actually names — reads only the tickets routed to them, which keeps one member's
// question about their payments out of the hands of staff who have no part in it.
export function seesEveryTicket(role) {
  return isAdminRole(role) || isOwnerRole(role);
}

// That rule expressed as a Prisma `where`, and the only place it is written down: the
// inbox list, the ticket detail and the reply route all build their query through it,
// so they cannot drift apart and leave one of them readable by staff it was never
// routed to. `extra` carries the id filter a single-ticket route adds.
export function ticketAccessWhere(role, userId, extra = {}) {
  return seesEveryTicket(role) ? { ...extra } : { ...extra, assignees: { some: { userId } } };
}

// The whole of the member-facing contract. It selects the department and the message
// bodies but never `senderId`, never the sender relation and never the assignees, so
// a reply reaches the portal as coming from the Trust rather than from a named person
// — and there is no field an accidental `include` could leak one through.
export const MEMBER_TICKET_SELECT = {
  id: true,
  reason: true,
  department: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  messages: {
    orderBy: { createdAt: "asc" },
    select: { id: true, body: true, senderType: true, createdAt: true },
  },
};

