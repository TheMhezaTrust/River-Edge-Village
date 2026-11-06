import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/auth";
import { ensureMemberRecordColumns } from "@/lib/provision";
import { photoFileResponse } from "@/lib/member-photo";

// The staff side of the profile-photo proxy. Serving the bytes here rather than
// linking to the Blob URL keeps that URL off the client — a Blob link is permanent
// and public, and this is a member's face tied to a real identity.
export async function GET(req, { params }) {
  const { error } = await guard("members:view");
  if (error) return error;
  const { id } = await params;
  const memberId = Number(id);

  await ensureMemberRecordColumns();
  const member = Number.isInteger(memberId)
    ? await prisma.member.findUnique({ where: { id: memberId }, select: { photoUrl: true } })
    : null;
  if (!member?.photoUrl) {
    return new Response("No photo", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  return photoFileResponse(member.photoUrl);
}
