import { handleUploadPresigned } from "@vercel/blob/client";
import { issueSignedToken } from "@vercel/blob";
import { NextResponse } from "next/server";
import { guard } from "@/lib/auth";

// Ad creative upload, using the same Vercel Blob presigned flow as the gallery:
// the browser asks here for a short-lived, put-scoped token and uploads straight
// to the store, so a large banner never passes through the serverless function.
// The advertisement row itself is written by a separate POST /api/ads call once
// the upload resolves.
const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(request) {
  const { error } = await guard("ads:manage");
  if (error) return error;

  const body = await request.json();

  try {
    const jsonResponse = await handleUploadPresigned({
      body,
      request,
      getSignedToken: async (pathname) => {
        const token = await issueSignedToken({
          token: process.env.BLOB_READ_WRITE_TOKEN,
          storeId: process.env.BLOB_STORE_ID,
          pathname,
          operations: ["put"],
          allowedContentTypes: ["image/*"],
          maximumSizeInBytes: MAX_BYTES,
        });
        return {
          token,
          urlOptions: { allowedContentTypes: ["image/*"], maximumSizeInBytes: MAX_BYTES },
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
