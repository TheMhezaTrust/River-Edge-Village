// The portal and the workstation are private areas. Both already carry
// noindex meta tags, but a robots directive keeps crawlers from requesting them
// at all — and from following the links to them that appear in the public navbar.
export default function robots() {
  return {
    rules: {
      userAgent: "*",
      disallow: ["/portal", "/workstation"],
    },
  };
}
