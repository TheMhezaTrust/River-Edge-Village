import { prisma } from "@/lib/prisma";
import { guard, audit, verifyConfirmToken } from "@/lib/auth";
import { ok, bad, created } from "@/lib/api";

export const STATUSES = ["ACTIVE", "PLANNING", "COMPLETED"];

function slugify(s) {
  return String(s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
const num = (v) => (v === "" || v == null ? null : Number(v));
const int = (v) => (v === "" || v == null ? null : Number(v));

function parseTimeline(raw) {
  if (raw == null || raw === "") return { value: null, error: null };
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return { value: null, error: "Timeline must be a JSON array" };
    return { value: JSON.stringify(parsed), error: null };
  } catch {
    return { value: null, error: "Timeline must be valid JSON" };
  }
}

export function buildProjectData(b, { partial = false } = {}) {
  const data = {};
  const errors = [];
  const strFields = ["name", "description", "location", "address", "status", "promoEndsAt", "thumbnail"];
  for (const f of strFields) if (f in b) data[f] = b[f] === "" ? null : b[f];
  if (!partial) {
    for (const f of ["name", "description", "location", "status"]) if (!b[f]) errors.push(f);
  }
  if ("status" in b && b.status && !STATUSES.includes(b.status)) errors.push("status");
  for (const f of ["farmSizeHa", "promoPrice", "standardPrice"]) if (f in b) data[f] = num(b[f]);
  for (const f of ["plotCount", "familyCount"]) if (f in b) data[f] = int(b[f]);
  if ("timeline" in b) {
    const { value, error } = parseTimeline(b.timeline);
    if (error) errors.push("timeline");
    else data.timeline = value;
  }
  return { data, errors };
}

export async function GET() {
  const { error } = await guard("projects:view");
  if (error) return error;
  const projects = await prisma.project.findMany({
    orderBy: { id: "asc" },
    include: { _count: { select: { plots: true } } },
  });
  return ok(projects);
}

export async function POST(req) {
  const { user, error } = await guard("projects:manage");
  if (error) return error;
  try {
    const b = await req.json();
    if (!(await verifyConfirmToken(b.confirmToken))) {
      return bad("Password confirmation required or expired. Please try again.", 401);
    }
    const { data, errors } = buildProjectData(b);
    if (errors.length) return bad(`Missing or invalid fields: ${errors.join(", ")}`);
    const slug = slugify(b.slug) || slugify(b.name);
    if (!slug) return bad("Could not derive a URL slug from the project name");
    const project = await prisma.project.create({ data: { ...data, slug } });
    await audit(user, "PROJECT_CREATED", "Project", project.id, project.name);
    return created(project);
  } catch (e) {
    return bad(e.code === "P2002" ? "A project with this slug already exists" : e.message);
  }
}
