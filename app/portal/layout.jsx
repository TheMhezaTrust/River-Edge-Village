// The member portal is a private area. It deliberately does not inherit the public
// site chrome — no Navbar, footer, chat widget or page-view tracker — and it is
// kept out of search indexes so member screens are never crawled.
export const metadata = {
  title: "Member Portal",
  robots: { index: false, follow: false },
};

export default function PortalLayout({ children }) {
  return <div className="min-h-screen bg-earth-50">{children}</div>;
}
