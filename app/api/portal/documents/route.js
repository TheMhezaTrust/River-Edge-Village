import { prisma } from "@/lib/prisma";
import { getActivePortalSession, unauthorized } from "@/lib/auth";
import { ok, bad, created } from "@/lib/api";
import { saveUpload } from "@/lib/uploads";

export async function POST(req) {
  const session = await getActivePortalSession();
  if (!session) return unauthorized();
  try {
    const form = await req.formData();
    const file = form.get("file");
    const category = form.get("category") || "OTHER";
    const title = form.get("title") || file?.name || "Untitled document";
    if (!file || typeof file === "string") return bad("No file uploaded");
    const filePath = await saveUpload(file);
    const doc = await prisma.memberDocument.create({
      data: { title, category, filePath, fileName: file.name, memberId: session.id },
    });
    return created(doc);
  } catch (e) {
    return bad(e.message);
  }
}

export async function GET() {
  const session = await getActivePortalSession();
  if (!session) return unauthorized();
  const docs = await prisma.memberDocument.findMany({ where: { memberId: session.id }, orderBy: { createdAt: "desc" } });
  return ok(docs);
}
