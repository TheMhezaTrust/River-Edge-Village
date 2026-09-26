import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import ChatBot from "@/components/site/ChatBot";
import { getAnySession, isStaffAdmin } from "@/lib/auth";

export default async function SiteLayout({ children }) {
  const session = await getAnySession();
  const isAuthenticated = !!session;
  const isAdmin = isStaffAdmin(session);
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar isAuthenticated={isAuthenticated} isAdmin={isAdmin} />
      <main className="flex-1">{children}</main>
      <Footer isAuthenticated={isAuthenticated} isAdmin={isAdmin} />
      <ChatBot />
    </div>
  );
}
