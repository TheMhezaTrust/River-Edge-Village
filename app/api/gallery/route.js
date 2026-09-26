import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/auth";
import { ok } from "@/lib/api";

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
