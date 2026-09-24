import { redirect } from "next/navigation";
import { getStaffSession, getActivePortalSession } from "@/lib/auth";
import LoginChooser from "@/components/site/LoginChooser";

export const metadata = { title: "Sign In", robots: { index: false } };

export default async function LoginPage({ searchParams }) {
  const { to } = await searchParams;
  const tab = to === "staff" ? "staff" : "member";

  if (tab === "staff") {
    if (await getStaffSession()) redirect("/workstation");
  } else if (await getActivePortalSession()) {
    redirect("/portal/dashboard");
  }

  return (
    <section className="py-20 bg-earth-50 min-h-[70vh]">
      <div className="mx-auto max-w-7xl px-4">
        <LoginChooser initialTab={tab} />
      </div>
    </section>
  );
}
