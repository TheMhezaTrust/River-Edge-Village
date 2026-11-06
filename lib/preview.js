import { redirect, notFound } from "next/navigation";
import { prisma } from "./prisma.js";
import { getStaffSession, can } from "./auth.js";
import { ensureMemberAccessTables, ensurePlotCertificateColumn, ensureMemberRecordColumns } from "./provision.js";

// Loads a member for the administrator "View as Member" preview. This is the staff-side
// mirror of loadPortalMember(): the same provisioning, the same include shape, so the
// shared portal views render identically. The difference is who is authenticated — here
// it is a staff user with members:view, and the member id comes from the URL because the
// staff user is the one signed in, never the member being previewed. Nothing here creates
// a portal session or signs anybody in as the member; it is read-only.
export async function loadPreviewMember(memberId) {
  const session = await getStaffSession();
  if (!session) redirect("/workstation/login");
  if (!can(session, "members:view")) redirect("/workstation");

  const id = Number(memberId);
  if (!Number.isInteger(id)) notFound();

  await Promise.all([
    ensureMemberAccessTables(),
    ensurePlotCertificateColumn(),
    ensureMemberRecordColumns(),
  ]);

  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      plots: {
        include: { project: true, payments: { where: { memberId: id }, orderBy: { date: "desc" } } },
        orderBy: { number: "asc" },
      },
      payments: { orderBy: { date: "desc" } },
    },
  });
  if (!member) notFound();

  return member;
}
