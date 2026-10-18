// A member's vault holds signed legal documents and the files themselves live in
// Vercel Blob. A Blob URL is a permanent public link — whoever holds it can read the
// document without signing in — so it never leaves the server: JSON responses carry
// metadata only, and every download is streamed through a route that has already
// proved who is asking.

export const PDF_MIME = "application/pdf";

// The cap is enforced here and in the signed token handed to the browser; the two
// have to agree, or the browser is told one limit and the vault records another.
export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

const BLOB_HOST_SUFFIX = ".blob.vercel-storage.com";

export function isBlobUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  // Checked because the download proxy fetches whatever is stored in this column:
  // without it, anyone who could write a document row could point the Trust's own
  // server at an arbitrary URL and read back what it found.
  return parsed.protocol === "https:" && parsed.hostname.endsWith(BLOB_HOST_SUFFIX);
}

// Drops the stored URL from anything sent to a browser. Callers build a download
// link from the id instead, and the proxy authorises that.
export function safeDocument(doc) {
  const { filePath, ...rest } = doc;
  return rest;
}

// A file name ends up inside a header, so quotes and line breaks are replaced — a
// crafted name could otherwise add headers of its own. Names carrying accents or
// African-language characters travel in the RFC 5987 filename* form as well, which
// is what a browser actually displays.
function contentDisposition(kind, fileName) {
  const name = String(fileName || "document.pdf");
  const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_").trim() || "document.pdf";
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

function plain(message, status) {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

// Streams the object back rather than redirecting the browser to it, so the
// authorization that got this far is the authorization that serves the bytes.
export async function documentFileResponse(doc, { download = false } = {}) {
  if (!isBlobUrl(doc.filePath)) {
    // A row written before the vault moved to Vercel Blob points at the old on-disk
    // path, which does not survive a serverless deployment.
    return plain(
      "This document was stored before the vault moved to cloud storage and can no longer be opened. Please ask the Trust office for a copy.",
      410,
    );
  }

  const upstream = await fetch(doc.filePath, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return plain(
      "The file could not be retrieved from storage. Please try again, or ask the Trust office for a copy.",
      502,
    );
  }

  const length = upstream.headers.get("content-length");
  return new Response(upstream.body, {
    headers: {
      "Content-Type": PDF_MIME,
      "Content-Disposition": contentDisposition(download ? "attachment" : "inline", doc.fileName),
      // no-store rather than private: a signed contract must not be left sitting in
      // a shared cache on its way to the member.
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...(length ? { "Content-Length": length } : {}),
    },
  });
}
