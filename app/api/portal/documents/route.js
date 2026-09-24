import { bad } from "@/lib/api";

// Documents are disabled for launch: no object storage is provisioned.
// Member document upload/listing are unavailable. Returns 410 Gone.
const GONE = () =>
  bad("Document management is temporarily unavailable during launch.", 410);

export async function GET() {
  return GONE();
}

export async function POST() {
  return GONE();
}
