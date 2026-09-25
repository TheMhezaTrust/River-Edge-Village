import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import ChatBot from "@/components/site/ChatBot";
import { getAnySession } from "@/lib/auth";

export default async function SiteLayout({ children }) {
  const isAuthenticated = !!(await getAnySession());
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar isAuthenticated={isAuthenticated} />
      <main className="flex-1">{children}</main>
      <Footer isAuthenticated={isAuthenticated} />
      <ChatBot />
    </div>
  );
}
