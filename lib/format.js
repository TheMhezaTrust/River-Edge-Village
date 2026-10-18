export const zar = (n) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(n || 0);

export const zarFull = (n) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(n || 0);

export const dateFmt = (d) =>
  d ? new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "-";

export const dateTimeFmt = (d) =>
  d ? new Date(d).toLocaleString("en-ZA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";

export const STATUS_LABELS = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  SOLD: "Sold",
  NEW: "New",
  CONTACTED: "Contacted",
  CONVERTED: "Converted",
  CLOSED: "Closed",
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  APPROVED: "Approved",
  NO_OBJECTION: "No Objection",
  REJECTED: "Rejected",
  TODO: "To Do",
  COMPLETED: "Completed",
  ONGOING: "Ongoing",
  ACTIVE: "Active",
  PLANNING: "Planning",
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
  SENT: "Sent",
  FAILED: "Failed",
  CONFIRMED: "Confirmed",
};

export const METHOD_LABELS = {
  EFT: "EFT",
  CASH: "Cash",
  CARD: "Card",
  DEBIT_ORDER: "Debit order",
  CHEQUE: "Cheque",
};

// What a document in a member's vault is. The member sees these labels too, so
// each one names the piece of paper rather than an internal filing category.
export const DOCUMENT_CATEGORIES = {
  ALLOCATION: "Acknowledgement of Payment and Plot Allocation",
  CONTRACT: "Signed contract",
  CERTIFICATE: "Certificate of Land Use",
  ID_COPY: "Certified ID copy",
  BENEFICIARY_FORM: "Beneficiary nomination form",
  BUILDING_PLAN: "Building plan",
  OTHER: "Other",
};

// The Trust's two Right of Use states. Which one applies depends on whether the
// Certificate of Land Use has been issued for the erf — not on whether the plot
// is paid off — so both wordings are fixed here rather than derived from a balance.
export const RIGHT_OF_USE = {
  PENDING: "Granted (Certificate Pending)",
  ISSUED: "Active (Certificate Issued)",
};

export function rightOfUseLabel(certificateIssuedAt) {
  return certificateIssuedAt ? RIGHT_OF_USE.ISSUED : RIGHT_OF_USE.PENDING;
}

// Vault sizes are stored as whole kilobytes; a scanned contract reads better in MB.
export const fileSizeLabel = (kb) => {
  if (kb == null) return null;
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
};

export function pillClass(status) {
  return `pill-${(status || "").toLowerCase().replace(/ /g, "_")}`;
}
