export const metadata = { title: "Documents" };

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Document Management</h1>
        <p className="text-sm text-gray-500 mt-1">Trust records, legal files, minutes and member documents</p>
      </div>
      <div className="card p-10 text-center">
        <p className="text-4xl mb-3" aria-hidden>📁</p>
        <h2 className="font-bold text-gray-900 mb-2">Document management is temporarily unavailable</h2>
        <p className="text-sm text-gray-600 max-w-lg mx-auto">
          File upload and download are disabled during the initial launch while document storage is
          being provisioned. Existing records remain safely on file at the Trust office and will be
          available here again soon.
        </p>
      </div>
    </div>
  );
}
