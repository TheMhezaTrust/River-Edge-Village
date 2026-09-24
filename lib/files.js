// Uploaded files live outside public/, so links must go through an
// authenticated download route. Stored paths look like "/files/<name>".
const PREFIX = "/files/";

export function staffDocumentUrl(filePath) {
  if (!filePath || filePath === "#" || !filePath.startsWith(PREFIX)) return filePath;
  return `/api/documents/file/${filePath.slice(PREFIX.length)}`;
}

export function staffMemberDocumentUrl(filePath) {
  if (!filePath || filePath === "#" || !filePath.startsWith(PREFIX)) return filePath;
  return `/api/members/documents/file/${filePath.slice(PREFIX.length)}`;
}

export function portalDocumentUrl(filePath) {
  if (!filePath || filePath === "#" || !filePath.startsWith(PREFIX)) return filePath;
  return `/api/portal/documents/file/${filePath.slice(PREFIX.length)}`;
}
