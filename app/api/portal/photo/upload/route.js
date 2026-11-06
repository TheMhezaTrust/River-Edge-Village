import { handleUploadPresigned } from "@vercel/blob/client";
import { issueSignedToken } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getActivePortalMember } from "@/lib/auth";
import { PHOTO_PREFIX, MAX_PHOTO_BYTES, PHOTO_TYPES } from "@/lib/member-photo";

// The member's browser uploads the photo straight to Vercel Blob; this route only hands
// out a short-lived, put-scoped token for one exact pathname inside the member's own
// folder, so the store's read/write token never reaches the client and a member cannot
// write over anybody else's photo. The photoUrl is saved by a separate POST /api/portal/photo.
export async function POST(request) {
  const member = await getActivePortalMember();
  const body = await request.json().catch(() => ({}));

  try {
    const jsonResponse = await handleUploadPresigned({
      body,
      request,
      getSignedToken: async (pathname) => {
        if (!member) throw new Error("Unauthorized");

        const prefix = `${PHOTO_PREFIX}${member.id}/`;
        if (!pathname.startsWith(prefix)) {
          throw new Error("That upload does not belong to your account.");
        }
        if (!/\.(jpe?g|png)$/i.test(pathname.slice(prefix.length))) {
          throw new Error("Only JPG or PNG photos can be uploaded.");
        }

        const token = await issueSignedToken({
          token: process.env.BLOB_READ_WRITE_TOKEN,
          storeId: process.env.BLOB_STORE_ID,
          pathname,
          operations: ["put"],
          allowedContentTypes: PHOTO_TYPES,
          maximumSizeInBytes: MAX_PHOTO_BYTES,
        });

        return {
          token,
          urlOptions: {
            allowedContentTypes: PHOTO_TYPES,
            maximumSizeInBytes: MAX_PHOTO_BYTES,
          },
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
