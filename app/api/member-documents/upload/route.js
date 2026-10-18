import { handleUploadPresigned } from "@vercel/blob/client";
import { issueSignedToken } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getStaffSession, verifyConfirmToken, can } from "@/lib/auth";
import { PDF_MIME, MAX_DOCUMENT_BYTES } from "@/lib/member-documents";

// The browser uploads the PDF straight to Vercel Blob; this route only hands out a
// short-lived, put-scoped token for one exact pathname, so the store's read/write
// token never reaches the client. The document's metadata is saved by a separate
// POST /api/members/:id/documents once the upload resolves.
export async function POST(request) {
  const session = await getStaffSession();
  // Parsed once here and handed to the SDK: a request body cannot be read twice.
  const body = await request.json().catch(() => ({}));

  try {
    const jsonResponse = await handleUploadPresigned({
      body,
      request,
      getSignedToken: async (pathname, clientPayload) => {
        if (!session || !can(session, "documents:manage")) throw new Error("Unauthorized");

        let payload = {};
        try {
          payload = JSON.parse(clientPayload || "{}");
        } catch {
          payload = {};
        }

        if (!(await verifyConfirmToken(payload.confirmToken))) {
          throw new Error("Password confirmation required or expired. Please try again.");
        }

        // The file has to land in the folder of the member it is being uploaded for,
        // so a valid token cannot be borrowed to write elsewhere in the store.
        const memberId = Number(payload.memberId);
        const prefix = `member-documents/${memberId}/`;
        if (!Number.isInteger(memberId) || !pathname.startsWith(prefix)) {
          throw new Error("That upload does not belong to this member.");
        }

        // The signed token also restricts the content type, so this is the check the
        // uploader actually reads: a clear message rather than a rejected PUT later.
        if (!/^[A-Za-z0-9._-]+\.pdf$/i.test(pathname.slice(prefix.length))) {
          throw new Error("Only PDF files can be uploaded to a member's vault.");
        }

        const token = await issueSignedToken({
          token: process.env.BLOB_READ_WRITE_TOKEN,
          storeId: process.env.BLOB_STORE_ID,
          pathname,
          operations: ["put"],
          allowedContentTypes: [PDF_MIME],
          maximumSizeInBytes: MAX_DOCUMENT_BYTES,
        });

        return {
          token,
          urlOptions: {
            allowedContentTypes: [PDF_MIME],
            maximumSizeInBytes: MAX_DOCUMENT_BYTES,
          },
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
