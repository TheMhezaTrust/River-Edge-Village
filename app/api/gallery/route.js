import { prisma } from "@/lib/prisma";
import { guard, verifyConfirmToken, audit } from "@/lib/auth";
import { ok, bad } from "@/lib/api";

// The GalleryImage table is additive and may not exist yet if `prisma db push`
// has not been run against a given environment. Create it on first save so the
// gallery works without a separate migration step. Idempotent and matches
// Prisma's PostgreSQL mapping for the model.
const ENSURE_TABLE = `CREATE TABLE IF NOT EXISTS "GalleryImage" (
  "id" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "title" TEXT,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GalleryImage_pkey" PRIMARY KEY ("id")
)`;

// Admin-only list of gallery images. The public /gallery page queries Prisma
// directly in its server component; this endpoint backs the workstation UI.
export async function GET() {
  const { error } = await guard("settings:manage");
  if (error) return error;
  try {
    const images = await prisma.galleryImage.findMany({ orderBy: { createdAt: "desc" } });
    return ok(images);
  } catch {
    // Table may not exist yet (auto-provisioned on first upload).
    return ok([]);
  }
}

// Persists the metadata for an image the browser already uploaded to Vercel Blob
// via the presigned flow. Gated behind the same password-confirmation token used
// to authorize the upload itself.
export async function POST(req) {
  const { user, error } = await guard("settings:manage");
  if (error) return error;
  try {
    const b = await req.json();
    if (!(await verifyConfirmToken(b.confirmToken))) {
      return bad("Password confirmation required or expired. Please try again.", 401);
    }
    const url = typeof b.url === "string" ? b.url.trim() : "";
    if (!url) return bad("Missing image URL.");
    const title = typeof b.title === "string" && b.title.trim() ? b.title.trim().slice(0, 200) : null;
    const description =
      typeof b.description === "string" && b.description.trim() ? b.description.trim().slice(0, 1000) : null;

    await prisma.$executeRawUnsafe(ENSURE_TABLE);
    const row = await prisma.galleryImage.create({ data: { url, title, description } });
    await audit(user, "GALLERY_IMAGE_CREATED", "GalleryImage", row.id, url);
    return ok(row);
  } catch (e) {
    return bad(e.message);
  }
}
