import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { guard, verifyConfirmToken, audit } from "@/lib/auth";
import { ok, bad } from "@/lib/api";
import { ensureMemberDocumentColumns } from "@/lib/provision";
import { isBlobUrl } from "@/lib/member-documents";

export async function DELETE(req, { params }) {
  const { user, error } = await guard("documents:manage");
  if (error) return error;
  const { id, docId } = await params;

  const token = req.nextUrl.searchParams.get("confirmToken");
  if (!(await verifyConfirmToken(token))) {
    return bad("Password confirmation required or expired. Please try again.", 401);
  }

  await ensureMemberDocumentColumns();
  // Scoped by the member in the URL as well as by the document id, so a guessed id
  // cannot reach into somebody else's vault.
  const doc = await prisma.memberDocument.findFirst({
    where: { id: Number(docId), memberId: Number(id) },
  });
  if (!doc) return bad("Document not found", 404);

  await prisma.memberDocument.delete({ where: { id: doc.id } });
  // Best-effort. The member loses access the moment the row goes, and an object
  // nobody holds a URL for is not a leak, so a storage failure must not undo the
  // deletion the office just asked for.
  try {
    if (isBlobUrl(doc.filePath)) await del(doc.filePath);
  } catch {
    // ignore
  }

  await audit(user, "MEMBER_DOCUMENT_DELETED", "MemberDocument", doc.id, {
    memberId: doc.memberId,
    title: doc.title,
    fileName: doc.fileName,
  });
  return ok({ ok: true });
}
