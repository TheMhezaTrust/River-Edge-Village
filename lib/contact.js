// Authoritative Trust details, taken from the Terms and Conditions of Sale
// (River Edge Rural Village - Portion 2 of Farm 970). Keep this file in sync
// with app/(site)/terms/page.jsx.
export const TRUST = {
  legalName: "The Mheza Trust",
  registrationNumber: "IT000099/2024(E)",
  email: "themhezatrust@gmail.com",
  website: "themhezatrust.co.za",
  siteUrl: "https://themhezatrust.co.za",
  // No telephone numbers: the Trust retired them on 25 Nov 2026 and takes contact
  // through the forms on /contact and the inbox above. Do not add one back.
  seller: "Mr Albert Shaw",
  attorney: "Mr Webb, Attorney of The Mheza Trust",
  administrator: "River Edge Primary Co-Op",
};

// Exact surveyed position of Portion 2 of Farm 970, supplied by the Trust on
// 26 Nov 2026. This is the pin behind the contact-page map and every "Get
// Directions" link; the two CMS fields in the "Farm Location" group default to
// it, so an administrator who overwrites the map there also owns the pin.
export const FARM = {
  lat: "-33.0657966",
  lng: "27.7711898",
  address: "Portion 2 of Farm 970, Cove Ridge East, Buffalo City, Eastern Cape, South Africa",
  directionsUrl: "https://maps.google.com/?q=-33.0657966,27.7711898",
};

// The original seller ("Mr Albert Shaw") and the Trust attorney ("Mr Webb") are
// withheld from visitors who are not logged in, and shown only to authenticated
// members. Public pages gate these with getPortalSession() from lib/auth.js.
export const sellerName = (isMember, fallback = "the original landowner") =>
  isMember ? TRUST.seller : fallback;

export const attorneyName = (isMember, fallback = "the Trust's attorney") =>
  isMember ? TRUST.attorney : fallback;
