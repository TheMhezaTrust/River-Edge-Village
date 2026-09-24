import { redirect } from "next/navigation";
import { getActivePortalSession } from "@/lib/auth";
import PortalLogin from "@/components/site/PortalLogin";

export const metadata = { title: "Member Portal Login" };

export default async function PortalPage() {
  const session = await getActivePortalSession();
  if (session) redirect("/portal/dashboard");

  return (
    <section className="py-20 bg-earth-50 min-h-[70vh]">
      <div className="mx-auto max-w-7xl px-4">
        <PortalLogin />
      </div>
    </section>
  );
}
