import { handleUploadPresigned } from "@vercel/blob/client";
import { issueSignedToken } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getStaffSession, verifyConfirmToken } from "@/lib/auth";

// Gallery upload using the Vercel Blob presigned flow. The store credentials
// (BLOB_STORE_ID / BLOB_READ_WRITE_TOKEN) are passed to the SDK explicitly. The
// browser calls uploadPresigned(), which POSTs here for a short-lived, put-scoped
// signed token. The image metadata itself is persisted by a separate POST
// /api/gallery call from the browser once the upload resolves.
export async function POST(request) {
  const session = await getStaffSession();
  const body = await request.json();

  try {
    const jsonResponse = await handleUploadPresigned({
      body,
      request,
      getSignedToken: async (pathname, clientPayload) => {
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

        const token = await issueSignedToken({
          token: process.env.BLOB_READ_WRITE_TOKEN,
          storeId: process.env.BLOB_STORE_ID,
          pathname,
          operations: ["put"],
          allowedContentTypes: ["image/*"],
          maximumSizeInBytes: 100 * 1024 * 1024,
        });

        return {
          token,
          urlOptions: {
            allowedContentTypes: ["image/*"],
            maximumSizeInBytes: 100 * 1024 * 1024,
          },
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
