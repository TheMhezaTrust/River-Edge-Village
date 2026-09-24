import path from "path";
import fs from "fs/promises";

// Outside public/ on purpose: uploaded files include members' certified ID copies
// and trust deeds, so they must only be reachable through an authenticated route.
const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads");

const MIME_BY_EXT = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export async function saveUpload(file) {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `${Date.now()}-${safeName}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(UPLOAD_DIR, fileName), bytes);
  return `/files/${fileName}`;
}

// Resolves a stored filePath ("/files/<name>") to a real path inside UPLOAD_DIR.
// Returns null for anything that would escape the directory.
export function resolveUpload(filePath) {
  if (typeof filePath !== "string") return null;
  const name = path.basename(filePath).replace(/[^a-zA-Z0-9._-]/g, "");
  if (!name || !filePath.endsWith(name)) return null;
  const full = path.join(UPLOAD_DIR, name);
  if (path.dirname(full) !== UPLOAD_DIR) return null;
  return { full, name };
}

export function mimeTypeFor(name) {
  return MIME_BY_EXT[path.extname(name).toLowerCase()] || "application/octet-stream";
}

export function readUpload(full) {
  return fs.readFile(full);
}
