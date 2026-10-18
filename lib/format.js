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

export function pillClass(status) {
  return `pill-${(status || "").toLowerCase().replace(/ /g, "_")}`;
}
