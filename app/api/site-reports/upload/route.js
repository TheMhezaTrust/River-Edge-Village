import { handleUploadPresigned } from "@vercel/blob/client";
import { issueSignedToken } from "@vercel/blob";
import { NextResponse } from "next/server";
import { guard } from "@/lib/auth";

// Site-work photo upload, using the same Vercel Blob presigned flow as the gallery and
// the Ad Manager: the browser asks here for a short-lived, put-scoped token and uploads
// straight to the store, so a phone photo taken on the site never passes through the
// serverless function. The report row itself is written by a separate POST
// /api/site-reports call once the upload resolves.
//
// The photo is optional — a report is still worth logging with no picture attached —
// and site-work photos carry no member or financial detail, so unlike member documents
// they are stored with public read access rather than behind a streaming proxy.
const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(request) {
  const { error } = await guard("sitereports:manage");
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
