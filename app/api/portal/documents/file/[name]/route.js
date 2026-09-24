import { prisma } from "@/lib/prisma";
import { getActivePortalSession, unauthorized } from "@/lib/auth";
import { resolveUpload, readUpload, mimeTypeFor } from "@/lib/uploads";

// A member may only fetch a file that belongs to their own record.
export async function GET(req, { params }) {
  const session = await getActivePortalSession();
  if (!session) return unauthorized();

  const { name } = await params;
  const resolved = resolveUpload(`/files/${name}`);
  if (!resolved) return new Response("Not found", { status: 404 });

  const doc = await prisma.memberDocument.findFirst({
    where: { memberId: session.id, filePath: `/files/${resolved.name}` },
  });
  if (!doc) return new Response("Not found", { status: 404 });

  try {
    const bytes = await readUpload(resolved.full);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": mimeTypeFor(resolved.name),
        "Content-Disposition": `inline; filename="${(doc.fileName || resolved.name).replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
