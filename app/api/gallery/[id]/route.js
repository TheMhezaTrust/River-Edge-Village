import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { guard, audit } from "@/lib/auth";
import { ok, bad } from "@/lib/api";

export async function DELETE(req, { params }) {
  const { user, error } = await guard("settings:manage");
  if (error) return error;
  const { id } = await params;
  try {
    const row = await prisma.galleryImage.findUnique({ where: { id } });
    if (!row) return bad("Image not found", 404);
    await prisma.galleryImage.delete({ where: { id } });
    // Best-effort Blob cleanup — never block metadata deletion on it. Reads
    // BLOB_READ_WRITE_TOKEN from the environment via the SDK default.
    try {
      await del(row.url);
    } catch {
      // ignore
    }
    await audit(user, "GALLERY_IMAGE_DELETED", "GalleryImage", id, row.url);
    return ok({ ok: true });
  } catch (e) {
    return bad(e.code === "P2025" ? "Image not found" : e.message);
  }
}
