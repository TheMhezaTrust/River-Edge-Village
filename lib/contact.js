// Authoritative Trust details, taken from the Terms and Conditions of Sale
// (River Edge Rural Village - Portion 2 of Farm 970). Keep this file in sync
// with app/(site)/terms/page.jsx.
export const TRUST = {
  legalName: "The Mheza Trust",
  registrationNumber: "IT000099/2024(E)",
  email: "themhezatrust@gmail.com",
  website: "themhezatrust.co.za",
  siteUrl: "https://themhezatrust.co.za",
  phones: ["081 391 7967", "081 708 2669", "081 488 5448"],
  primaryPhone: "081 391 7967",
  primaryPhoneHref: "tel:+27813917967",
  seller: "Mr Albert Shaw",
  attorney: "Mr Webb, Attorney of The Mheza Trust",
  administrator: "River Edge Primary Co-Op",
};

// The original seller ("Mr Albert Shaw") and the Trust attorney ("Mr Webb") are
// withheld from visitors who are not logged in, and shown only to authenticated
// members. Public pages gate these with getPortalSession() from lib/auth.js.
export const sellerName = (isMember, fallback = "the original landowner") =>
  isMember ? TRUST.seller : fallback;

export const attorneyName = (isMember, fallback = "the Trust's attorney") =>
  isMember ? TRUST.attorney : fallback;
