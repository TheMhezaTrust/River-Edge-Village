import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import ChatBot from "@/components/site/ChatBot";
import PageViewTracker from "@/components/site/PageViewTracker";

export default function SiteLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <ChatBot />
      <PageViewTracker />
    </div>
  );
}
