import { prisma } from "@/lib/prisma";
import { getActivePortalMember, unauthorized, audit } from "@/lib/auth";
import { ok, bad } from "@/lib/api";
import { ensureMemberRecordColumns } from "@/lib/provision";
import { PHOTO_PREFIX, isPhotoUrl, photoFileResponse } from "@/lib/member-photo";

// Serves the signed-in member's own profile photo. The Blob URL is never handed to the
// browser — the image is streamed through here so the authorization that loaded the page
// is the authorization that serves the bytes.
export async function GET() {
  const member = await getActivePortalMember();
  if (!member) return unauthorized();
  await ensureMemberRecordColumns();
  const row = await prisma.member.findUnique({ where: { id: member.id }, select: { photoUrl: true } });
  if (!row?.photoUrl) {
    return new Response("No photo", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return photoFileResponse(row.photoUrl);
}

// Saves the photo the member just uploaded. The URL is checked to be a Blob link inside
// the member's own folder, so nobody can point their photoUrl at an arbitrary address
// (which the proxy would then fetch on their behalf) or at somebody else's photo.
export async function POST(req) {
  const member = await getActivePortalMember();
  if (!member) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const url = String(b.url ?? "");

  if (!isPhotoUrl(url)) return bad("That is not a valid stored photo.");
  if (!url.includes(`/${PHOTO_PREFIX}${member.id}/`)) return bad("That photo does not belong to your account.");

  await ensureMemberRecordColumns();
  await prisma.member.update({ where: { id: member.id }, data: { photoUrl: url } });
  await audit(null, "MEMBER_PHOTO_UPDATED", "Member", member.id, "profile photo");
  return ok({ photoUrl: url });
}
