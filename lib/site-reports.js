import { isAdminRole, isOwnerRole } from "./roles.js";

// Ground-work logging. The Operations / Site Manager writes down what was done on the
// site — clearing, fencing, grading, repairs — and the Main Administrator reads it.
//
// Reports are append-only for everybody, administrators included: there is no update
// and no delete route anywhere, and the table carries no updatedAt column. What was
// done on the ground is the Trust's record of an event that already happened, so it
// stays exactly as the person who did the work wrote it.
//
// Nothing here imports Prisma.
const MIN_TITLE = 3;
const MAX_TITLE = 140;
const MAX_NOTES = 4000;

// A report is dated by the day the work was done, which is not necessarily the day it
// was logged — a manager may write up a week of site work on a Friday. The form is a
// date input, so this is either a YYYY-MM-DD string or nothing.
function normalizeWorkDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ""))) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// The whole of the write path goes through this, so the limits cannot drift apart
// between the form and the API.
export function normalizeReport({ workDate, title, notes } = {}) {
  const date = normalizeWorkDate(workDate);
  if (!date) return { data: null, error: "Please choose the date the work was done." };

  const summary = typeof title === "string" ? title.trim() : "";
  if (summary.length < MIN_TITLE) {
    return { data: null, error: "Please write a short summary of the work." };
  }
  if (summary.length > MAX_TITLE) {
    return { data: null, error: `That summary is too long. Please keep it under ${MAX_TITLE} characters.` };
  }

  const body = typeof notes === "string" ? notes.trim() : "";
  if (body.length > MAX_NOTES) {
    return { data: null, error: `Those notes are too long. Please keep them under ${MAX_NOTES} characters.` };
  }

  return { data: { workDate: date, title: summary, notes: body || null }, error: null };
}

// An administrator reads every report, and so does the software owner, whose role is
// to audit the whole system. A site manager reads only their own past reports — they
// log work, they do not supervise anybody else's.
export function seesEveryReport(role) {
  return isAdminRole(role) || isOwnerRole(role);
}

// That rule expressed as a Prisma `where`, and the only place it is written down: the
// feed and any single-report read build their query through it, so they cannot drift
// apart and leave one site manager able to read another's reports. `extra` carries the
// id filter a single-report route adds.
export function reportAccessWhere(role, userId, extra = {}) {
  return seesEveryReport(role) ? { ...extra } : { ...extra, createdById: userId };
}

// The feed's shape. The author is named because an administrator reading it needs to
// know who did the work; a site manager only ever receives their own reports, so the
// field tells them nothing they did not write.
export const REPORT_SELECT = {
  id: true,
  workDate: true,
  title: true,
  notes: true,
  photoUrl: true,
  photoName: true,
  createdAt: true,
  createdBy: { select: { id: true, name: true } },
};
