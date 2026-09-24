import { prisma } from "@/lib/prisma";
import { guard, can } from "@/lib/auth";
import { resolveUpload, readUpload, mimeTypeFor } from "@/lib/uploads";

export async function GET(req, { params }) {
  const { user, error } = await guard("documents:view");
  if (error) return error;

  const { name } = await params;
  const resolved = resolveUpload(`/files/${name}`);
  if (!resolved) return new Response("Not found", { status: 404 });

  const doc = await prisma.document.findFirst({ where: { filePath: `/files/${resolved.name}` } });
  if (!doc) return new Response("Not found", { status: 404 });

  const allowed = !doc.permissions || can(user, "users:manage") || doc.permissions.split(",").includes(user.role);
  if (!allowed) return new Response("Forbidden", { status: 403 });

  try {
    const bytes = await readUpload(resolved.full);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": doc.mimeType || mimeTypeFor(resolved.name),
        "Content-Disposition": `inline; filename="${(doc.fileName || resolved.name).replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
