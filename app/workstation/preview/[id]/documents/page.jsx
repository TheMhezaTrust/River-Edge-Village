import { prisma } from "@/lib/prisma";
import { loadPreviewMember } from "@/lib/preview";
import { ensureMemberDocumentColumns } from "@/lib/provision";
import { DOCUMENT_CATEGORIES, dateFmt, fileSizeLabel } from "@/lib/format";
import { EmptyState } from "@/components/ui";
import PreviewShell from "@/components/portal/PreviewShell";
import PageHeading from "@/components/portal/PageHeading";
import { DocumentIcon } from "@/components/portal/Icons";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Certificate (Preview)", robots: { index: false } };

export default async function DocumentsPreviewPage({ params }) {
  const { id } = await params;
  const member = await loadPreviewMember(id);

  await ensureMemberDocumentColumns();
  const documents = await prisma.memberDocument.findMany({
    where: { memberId: member.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <PreviewShell member={member} active="documents">
      <div className="space-y-6">
        <PageHeading
          title="My Certificate"
          subtitle="Your Certificate of Land Use and the signed paperwork the Trust holds for you. Keep a copy on your own device as well — this is what proves your plot allocation and the payments you have made."
        />

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <strong>Preview mode:</strong> Downloads below use the staff document proxy. The member&apos;s own portal
          serves these through their signed-in session.
        </div>

        {documents.length === 0 ? (
          <div className="card p-6">
            <EmptyState
              title="No certificate yet"
              message="Once the Trust office issues the Certificate of Land Use it will appear here. Upload it from the member's workstation profile under Certificate Vault."
            />
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
                      href={`/api/member-documents/${doc.id}/file`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-outline btn-sm"
                    >
                      View
                    </a>
                    <a href={`/api/member-documents/${doc.id}/file?download=1`} className="btn-primary btn-sm">
                      Download
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs leading-relaxed text-gray-500">
          These files are visible only to the member and to Trust staff. They are served through an authorizing
          proxy rather than from a public link, so forwarding a web address does not give anybody else access.
        </p>
      </div>
    </PreviewShell>
  );
}
