// The account is the Co-Op's, not the Trust's, so it is labelled that way
// wherever it appears (it mirrors the public site footer). The reference format is
// fixed by clause 6.4 of the Terms and Conditions of Sale: Plot Number – Buyer Name.
export default function BankingDetails({ member }) {
  const plotNumber = member.plots?.[0]?.number || "000";
  const severalPlots = (member.plots?.length || 0) > 1;

  return (
    <div className="text-sm text-gray-700 space-y-1.5">
      <p className="font-semibold text-gray-900">Pay by EFT:</p>
      <p>Absa · River Edge SA Primary Co-operative Ltd</p>
      <p className="font-mono text-xs">Acc 4121013447 · Branch 632005</p>
      <p className="font-semibold pt-2">Reference (mandatory):</p>
      <p className="font-mono text-xs bg-white border border-gray-200 rounded px-2 py-1.5">
        {plotNumber} – {member.fullName}
      </p>
      {severalPlots && (
        <p className="text-xs text-gray-500 pt-1">
          Paying for a different plot? Use that plot's number in place of {plotNumber} (format: Plot Number – Buyer Name).
        </p>
      )}
    </div>
  );
}
