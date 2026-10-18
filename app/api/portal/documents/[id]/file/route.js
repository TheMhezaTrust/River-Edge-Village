import { prisma } from "@/lib/prisma";
import { getActivePortalMember, unauthorized } from "@/lib/auth";
import { ensureMemberDocumentColumns } from "@/lib/provision";
import { documentFileResponse } from "@/lib/member-documents";

// The member side of the vault's download proxy. The member id comes from the
// verified session and forms part of the lookup, so another member's document is
// not merely refused — as far as this route is concerned it does not exist, which
// is why the answer is 404 rather than 403.
export async function GET(req, { params }) {
  const member = await getActivePortalMember();
  if (!member) return unauthorized();
  const { id } = await params;
  const docId = Number(id);

  await ensureMemberDocumentColumns();
  const doc = Number.isInteger(docId)
    ? await prisma.memberDocument.findFirst({ where: { id: docId, memberId: member.id } })
    : null;
  if (!doc) {
    return new Response("Document not found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  return documentFileResponse(doc, { download: req.nextUrl.searchParams.get("download") === "1" });
}
