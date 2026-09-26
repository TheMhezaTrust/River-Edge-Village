// Normalizes an administrator-supplied location value into a safe <iframe> src
// for an interactive Google Map. Accepts any of:
//   1. A full <iframe> embed snippet (Google Maps "Share → Embed a map").
//   2. A ready-to-embed URL (contains /maps/embed or output=embed).
//   3. A standard Google Maps link (place/share/short link).
//   4. A plain address or "lat,lng" string.
// The result is ALWAYS an http(s) URL, so a pasted javascript:/data: scheme can
// never become the iframe src. Returns null when there is nothing to render.
export function googleMapEmbedSrc(raw) {
  if (raw == null) return null;
  let v = String(raw).trim();
  if (!v) return null;

  // 1) Full <iframe ...> snippet — pull out its src attribute.
  const iframe = v.match(/<iframe[^>]+src\s*=\s*["']([^"']+)["']/i);
  const fromIframe = !!iframe;
  if (fromIframe) v = iframe[1].trim();

  const isHttp = /^https?:\/\//i.test(v);

  // An embed snippet's src, or any already-embeddable URL, is used directly.
  if (isHttp && (fromIframe || /[?&]output=embed/i.test(v) || /\/maps\/embed\b/i.test(v))) {
    return v;
  }

  // 3) A standard Google Maps link. Prefer explicit @lat,lng center coords
  //    (most reliable), then a q= query, then a /maps/place/<name> segment.
  if (isHttp) {
    const at = v.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (at) return `https://www.google.com/maps?q=${at[1]},${at[2]}&output=embed`;
    try {
      const u = new URL(v);
      const q = u.searchParams.get("q");
      if (q) return `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
      const place = u.pathname.match(/\/maps\/place\/([^/]+)/);
      if (place) {
        const name = decodeURIComponent(place[1]).replace(/\+/g, " ");
        return `https://www.google.com/maps?q=${encodeURIComponent(name)}&output=embed`;
      }
    } catch {
      // fall through to the generic wrap below
    }
  }

  // 4) A plain address / coordinates / unparsable link. Non-http input is
  //    URL-encoded into a google.com query, so it can never execute as a scheme.
  return `https://www.google.com/maps?q=${encodeURIComponent(v)}&output=embed`;
}
