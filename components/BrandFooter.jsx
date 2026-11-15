const BRAND = "Powered by V963 Nexus | Owned & Maintained by View963 Tech (Pty) Ltd";

export default function BrandFooter({ className = "" }) {
  return (
    <footer className={`w-full px-4 py-2 text-center text-[10px] leading-4 text-gray-400 print:hidden ${className}`}>
      {BRAND}
    </footer>
  );
}
