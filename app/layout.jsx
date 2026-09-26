import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://themhezatrust.co.za";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "The Mheza Trust | River Edge Rural Village",
    template: "%s | The Mheza Trust",
  },
  description:
    "The Mheza Trust builds legal, planned rural communities for South African families. River Edge Rural Village: serviced 800m2 plots on 31.9 hectares in Buffalo City, Eastern Cape.",
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "The Mheza Trust",
    title: "The Mheza Trust | River Edge Rural Village",
    description:
      "The Mheza Trust builds legal, planned rural communities for South African families. River Edge Rural Village: serviced 800m2 plots on 31.9 hectares in Buffalo City, Eastern Cape.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
