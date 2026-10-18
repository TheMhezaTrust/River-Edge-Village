import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/auth";
import { ensureMemberDocumentColumns } from "@/lib/provision";
import { documentFileResponse } from "@/lib/member-documents";

// The staff side of the vault's download proxy. Serving the bytes here rather than
// linking to the Blob URL is what keeps the URL off the client: a Blob link is
// permanent and public, and these are signed documents carrying ID numbers.
export async function GET(req, { params }) {
  const { error } = await guard("documents:view");
  if (error) return error;
  const { id } = await params;
  const docId = Number(id);

  await ensureMemberDocumentColumns();
  const doc = Number.isInteger(docId)
    ? await prisma.memberDocument.findUnique({ where: { id: docId } })
    : null;
  if (!doc) {
    return new Response("Document not found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  return documentFileResponse(doc, { download: req.nextUrl.searchParams.get("download") === "1" });
}
