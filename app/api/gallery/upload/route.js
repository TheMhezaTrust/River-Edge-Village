import { handleUpload } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaffSession, verifyConfirmToken, audit } from "@/lib/auth";

// The GalleryImage table is additive and may not exist yet if `prisma db push`
// has not been run against a given environment. Create it on first save so the
// gallery works without a separate migration step. Idempotent and matches
// Prisma's PostgreSQL mapping for the model.
const ENSURE_TABLE = `CREATE TABLE IF NOT EXISTS "GalleryImage" (
  "id" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "title" TEXT,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GalleryImage_pkey" PRIMARY KEY ("id")
)`;

// Client-side upload handler. The browser calls `upload()` from
// @vercel/blob/client, which POSTs here twice:
//   1. GenerateClientTokenEvent — from the logged-in admin's browser (has the
//      session cookie). We authorize here and require the short-lived password
//      confirmation token, then hand back an upload token.
//   2. UploadCompletedEvent — from Vercel Blob's servers (no cookie). We persist
//      the image metadata to Postgres here.
export async function POST(request) {
  // Read the staff session up front so it is available to the token-generation
  // callback (which runs within this same request). It is null for Vercel's
  // server-to-server completion callback, which does not need it.
  const session = await getStaffSession();
  const body = await request.json();

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!session) throw new Error("Unauthorized");

        let payload = {};
        try {
          payload = JSON.parse(clientPayload || "{}");
        } catch {
          payload = {};
        }

        if (!(await verifyConfirmToken(payload.confirmToken))) {
          throw new Error("Password confirmation required or expired. Please try again.");
        }

        return {
          allowedContentTypes: ["image/*"],
          maximumSizeInBytes: 100 * 1024 * 1024,
          tokenPayload: JSON.stringify({
            title: typeof payload.title === "string" ? payload.title.slice(0, 200) : null,
            description: typeof payload.description === "string" ? payload.description.slice(0, 1000) : null,
            uploadedBy: session.id,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        let p = {};
        try {
          p = JSON.parse(tokenPayload || "{}");
        } catch {
          p = {};
        }
        await prisma.$executeRawUnsafe(ENSURE_TABLE);
        const row = await prisma.galleryImage.create({
          data: { url: blob.url, title: p.title ?? null, description: p.description ?? null },
        });
        await audit(
          p.uploadedBy != null ? { id: p.uploadedBy } : null,
          "GALLERY_IMAGE_CREATED",
          "GalleryImage",
          row.id,
          blob.url,
        );
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
