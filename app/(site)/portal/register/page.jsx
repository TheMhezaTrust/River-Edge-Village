import { redirect } from "next/navigation";
import { getActivePortalSession } from "@/lib/auth";
import PortalRegister from "@/components/site/PortalRegister";

export const metadata = {
  title: "Member Sign Up",
  description: "Create your River Edge Rural Village member account to view your payment details, balance and documents, and to upload documents securely.",
};

export default async function PortalRegisterPage() {
  const session = await getActivePortalSession();
  if (session) redirect("/portal/dashboard");

  return (
    <section className="py-20 bg-earth-50 min-h-[70vh]">
      <div className="mx-auto max-w-7xl px-4">
        <PortalRegister />
      </div>
    </section>
  );
}
