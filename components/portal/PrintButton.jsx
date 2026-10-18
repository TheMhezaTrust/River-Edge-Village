"use client";

import { PrinterIcon } from "./Icons";

// The Trust does not have a PDF library, so the statement is a print-optimised
// page and the member saves it to PDF from the browser's own print dialog — the
// same approach the workstation payslip uses.
export default function PrintButton({ label = "Print / Save as PDF" }) {
  return (
    <button type="button" className="btn-primary btn-sm print:hidden" onClick={() => window.print()}>
      <PrinterIcon width={16} height={16} />
      {label}
    </button>
  );
}
