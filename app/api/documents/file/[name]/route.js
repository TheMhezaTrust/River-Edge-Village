// Documents are disabled for launch (no object storage). Returns 410 Gone.
export async function GET() {
  return new Response("Document management is temporarily unavailable during launch.", {
    status: 410,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
