import { prisma } from "@/lib/prisma";
import { guard, verifyConfirmToken, audit } from "@/lib/auth";
import { ok, bad } from "@/lib/api";
import { ensureMemberDocumentColumns } from "@/lib/provision";
import { safeDocument, isBlobUrl } from "@/lib/member-documents";
import { DOCUMENT_CATEGORIES } from "@/lib/format";

export async function GET(req, { params }) {
  const { error } = await guard("documents:view");
  if (error) return error;
  const { id } = await params;
  // Awaited rather than left to the eager kick-off in lib/prisma.js: the client
  // selects the vault columns, so on a cold start they have to exist first.
  await ensureMemberDocumentColumns();
  const documents = await prisma.memberDocument.findMany({
    where: { memberId: Number(id) },
    include: { uploadedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return ok(documents.map(safeDocument));
}

// Saves the metadata for a PDF the browser has already uploaded to Vercel Blob
// through the presigned flow. Gated behind the same password confirmation that
// authorized the upload itself.
export async function POST(req, { params }) {
  const { user, error } = await guard("documents:manage");
  if (error) return error;
  const { id } = await params;
  const memberId = Number(id);
  const b = await req.json().catch(() => ({}));

  if (!(await verifyConfirmToken(b.confirmToken))) {
    return bad("Password confirmation required or expired. Please try again.", 401);
  }

  const title = typeof b.title === "string" ? b.title.trim().slice(0, 200) : "";
  if (!title) return bad("Give the document a title the member will recognise.");
  const fileName = typeof b.fileName === "string" ? b.fileName.trim().slice(0, 200) : "";
  if (!fileName) return bad("Missing file name.");
  const filePath = typeof b.filePath === "string" ? b.filePath.trim() : "";
  if (!isBlobUrl(filePath)) return bad("That file location is not a Vercel Blob URL.");
  const category = Object.hasOwn(DOCUMENT_CATEGORIES, b.category) ? b.category : "OTHER";
  const size = Number(b.sizeKb);
  const sizeKb = Number.isFinite(size) && size > 0 ? Math.round(size) : null;

  await ensureMemberDocumentColumns();
  const member = await prisma.member.findUnique({ where: { id: memberId }, select: { id: true } });
  if (!member) return bad("Member not found", 404);

  const doc = await prisma.memberDocument.create({
    data: { memberId, title, category, filePath, fileName, sizeKb, uploadedById: user.id },
  });
  await audit(user, "MEMBER_DOCUMENT_UPLOADED", "MemberDocument", doc.id, {
    memberId,
    title,
    category,
    fileName,
    sizeKb,
  });
  return ok(safeDocument(doc));
}
