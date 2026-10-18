import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { loadPortalMember } from "@/lib/portal-data";
import { ensureMemberDocumentColumns } from "@/lib/provision";
import { DOCUMENT_CATEGORIES, dateFmt, fileSizeLabel } from "@/lib/format";
import { TRUST } from "@/lib/contact";
import { EmptyState } from "@/components/ui";
import PageHeading from "@/components/portal/PageHeading";
import { DocumentIcon } from "@/components/portal/Icons";

export const dynamic = "force-dynamic";

export const metadata = { title: "My Documents · Member Portal" };

export default async function PortalDocumentsPage() {
  const member = await loadPortalMember();
  if (!member) redirect("/portal");

  await ensureMemberDocumentColumns();
  // Scoped by the member id from the verified session, so this page can only ever
  // list the signed-in member's own documents.
  const documents = await prisma.memberDocument.findMany({
    where: { memberId: member.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeading
        title="My Documents"
        subtitle="The signed paperwork the Trust holds for you. Keep a copy on your own device as well — this is what proves your plot allocation and the payments you have made."
      />

      {documents.length === 0 ? (
        <div className="card p-6">
          <EmptyState
            title="No documents yet"
            message="Once the Trust office issues your signed Acknowledgement of Payment and Plot Allocation it will appear here. If you have already signed one and cannot see it, please contact the office."
          />
          <p className="mt-4 text-center text-sm text-gray-600">
            Call{" "}
            <a href={TRUST.primaryPhoneHref} className="font-semibold text-forest-700 hover:underline">
              {TRUST.primaryPhone}
            </a>{" "}
            or email{" "}
            <a href={`mailto:${TRUST.email}`} className="font-semibold text-forest-700 hover:underline">
              {TRUST.email}
            </a>
            .
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => {
            const size = fileSizeLabel(doc.sizeKb);
            return (
              <div key={doc.id} className="card flex flex-wrap items-start gap-4 p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-forest-50 text-forest-700">
                  <DocumentIcon width={22} height={22} />
                </span>

                <div className="min-w-0 flex-1">
                  <h2 className="font-bold leading-snug text-forest-900">{doc.title}</h2>
                  <p className="mt-1 text-xs text-gray-500">
                    {DOCUMENT_CATEGORIES[doc.category] || doc.category}
                    {" · added "}
                    {dateFmt(doc.createdAt)}
                    {size ? ` · ${size}` : ""}
                  </p>
                  <p className="mt-1 truncate text-xs text-gray-400">{doc.fileName}</p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <a
                    href={`/api/portal/documents/${doc.id}/file`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-outline btn-sm"
                  >
                    View
                  </a>
                  <a href={`/api/portal/documents/${doc.id}/file?download=1`} className="btn-primary btn-sm">
                    Download
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs leading-relaxed text-gray-500">
        These files are visible only to you and to Trust staff. They are served through the portal rather than
        from a public link, so forwarding a web address does not give anybody else access — they have to sign in
        as you, which is why your password must stay private.
      </p>
    </div>
  );
}
