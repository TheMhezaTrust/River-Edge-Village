import { TRUST } from "@/lib/contact";
import { getSiteContent } from "@/lib/site-content";
import TermsAcceptance from "@/components/TermsAcceptance";

export const metadata = {
  title: "Terms and Conditions of Sale",
  description:
    "Terms and Conditions of Sale for River Edge Rural Village, Portion 2 of Farm 970 — The Mheza Trust, Registration Number IT000099/2024(E).",
};
export const dynamic = "force-dynamic";

export default async function TermsPage() {
  const C = await getSiteContent();
  const body = C["terms.body"] || "";

  return (
    <>
      <section className="bg-forest-800 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-forest-300 mb-2">Public Information</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Terms and Conditions of Sale</h1>
          <p className="mt-3 text-forest-100 max-w-3xl">
            River Edge Rural Village – Portion 2 of Farm 970 · {TRUST.legalName} (Registration Number: {TRUST.registrationNumber})
          </p>
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <article className="rounded-xl border border-gray-200 bg-white p-6 md:p-10 shadow-sm">
            <div className="whitespace-pre-wrap text-sm md:text-[15px] text-gray-700 leading-relaxed">{body}</div>
          </article>

          <div className="mt-8">
            <TermsAcceptance />
          </div>
        </div>
      </section>
    </>
  );
}
