// A member's profile photo. Like the certificate vault, the image itself lives in
// Vercel Blob and the stored URL is a permanent public link, so it never reaches a
// browser: the picture is streamed through a route that has already proved who is
// asking (the member's own /api/portal/photo, or staff /api/members/:id/photo).

import { isBlobUrl } from "./member-documents.js";

export const PHOTO_PREFIX = "member-photos/";
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png"];

// The pathname a member's photo is uploaded to. The presigned token is scoped to the
// member's own folder, so a valid token cannot be borrowed to write elsewhere.
export function photoPathname(memberId, file) {
  const ext = (file?.name || "").match(/\.(jpe?g|png)$/i)?.[0]?.toLowerCase() || ".jpg";
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${PHOTO_PREFIX}${memberId}/${unique}${ext}`;
}

export function isPhotoUrl(url) {
  return isBlobUrl(url);
}

function plain(message, status) {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

// Streams the image back rather than redirecting the browser to the Blob URL, so the
// authorization that got this far is the authorization that serves the bytes.
export async function photoFileResponse(url) {
  if (!isBlobUrl(url)) {
    return plain("This photo could not be opened. Please upload it again, or ask the Trust office for help.", 410);
  }
  const upstream = await fetch(url, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return plain("The photo could not be retrieved from storage. Please try again.", 502);
  }
  const contentType = upstream.headers.get("content-type") || "image/jpeg";
  return new Response(upstream.body, {
    headers: {
      "Content-Type": contentType,
      // no-store: the browser refetches after a member replaces their photo, so the
      // new picture appears immediately rather than a stale one being served from cache.
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
