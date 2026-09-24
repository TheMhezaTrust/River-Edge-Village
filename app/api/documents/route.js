import { prisma } from "@/lib/prisma";
import { guard, audit, can } from "@/lib/auth";
import { ok, bad, created } from "@/lib/api";
import { saveUpload } from "@/lib/uploads";

export async function GET(req) {
  const { user, error } = await guard("documents:view");
  if (error) return error;
  const sp = req.nextUrl.searchParams;
  const where = {};
  if (sp.get("folder")) where.folder = sp.get("folder");
  if (sp.get("q")) {
    const q = sp.get("q");
    where.OR = [{ title: { contains: q } }, { tags: { contains: q } }, { description: { contains: q } }];
  }
  const docs = await prisma.document.findMany({
    where,
    include: { uploadedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  const visible = docs.filter((d) => !d.permissions || can(user, "users:manage") || d.permissions.split(",").includes(user.role));
  return ok(visible);
}

export async function POST(req) {
  const { user, error } = await guard("documents:manage");
  if (error) return error;
  try {
    const form = await req.formData();
    const title = form.get("title");
    const folder = form.get("folder") || "PROJECT";
    const tags = form.get("tags") || null;
    const description = form.get("description") || null;
    const permissions = form.get("permissions") || null;
    const file = form.get("file");
    if (!title) return bad("Title is required");
    let filePath = "#";
    let fileName = "";
    let mimeType = null;
    let sizeKb = null;
    if (file && typeof file !== "string") {
      filePath = await saveUpload(file);
      fileName = file.name;
      mimeType = file.type;
      sizeKb = Math.round(file.size / 1024);
    }
    const doc = await prisma.document.create({
      data: { title, folder, tags, description, filePath, fileName, mimeType, sizeKb, permissions, uploadedById: user.id },
    });
    await prisma.notification.create({ data: { text: `New document uploaded: ${title}`, type: "DOCUMENT" } });
    await audit(user, "DOCUMENT_UPLOADED", "Document", doc.id, title);
    return created(doc);
  } catch (e) {
    return bad(e.message);
  }
}

export async function DELETE(req) {
  const { user, error } = await guard("documents:manage");
  if (error) return error;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return bad("id is required");
  await prisma.document.delete({ where: { id: Number(id) } });
  await audit(user, "DOCUMENT_DELETED", "Document", id);
  return ok({ ok: true });
}
