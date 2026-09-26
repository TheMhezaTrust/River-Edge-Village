import Link from "next/link";

export default function Forbidden() {
  return (
    <section className="bg-forest-800 py-24">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-6xl font-extrabold text-white">403</p>
        <h1 className="mt-4 text-3xl font-bold text-white">Unauthorized</h1>
        <p className="mt-3 text-forest-100 leading-relaxed">
          The Available Plots section and layout are restricted to administrators of The Mheza Trust.
          Your account does not have permission to view this page.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-accent px-6 py-3">Back to Home</Link>
          <Link href="/login" className="btn-white px-6 py-3">Log in as Administrator</Link>
        </div>
      </div>
    </section>
  );
}
