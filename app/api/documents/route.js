import { bad } from "@/lib/api";

// Documents are disabled for launch: no object storage is provisioned, so
// upload/download/listing are unavailable. Returns 410 Gone to callers.
const GONE = () =>
  bad("Document management is temporarily unavailable during launch.", 410);

export async function GET() {
  return GONE();
}

export async function POST() {
  return GONE();
}

export async function DELETE() {
  return GONE();
}
