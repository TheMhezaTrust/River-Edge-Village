import InterestForm from "@/components/InterestForm";
import { SectionHeading } from "@/components/ui";
import { TRUST } from "@/lib/contact";

export const metadata = {
  title: "Contact Us",
  description: "Contact The Mheza Trust — phone, email, office details, contact form, interest registration and site viewing bookings.",
};

export default function ContactPage() {
  return (
    <>
      <section className="bg-forest-800 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-forest-300 mb-2">We'd Love to Hear From You</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">Contact Us</h1>
        </div>
      </section>

      <section className="py-14 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid gap-10 lg:grid-cols-2">
          {/* Contact form */}
          <div id="contact-form" className="card p-6 md:p-8 h-fit">
            <h2 className="text-xl font-bold text-forest-900 mb-5">Send Us a Message</h2>
            <InterestForm kind="CONTACT" />
          </div>

          {/* Info + map */}
          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                ["📍", "Physical Address", ["Cove Ridge East", "Buffalo City Metropolitan Municipality", "Eastern Cape, South Africa"]],
                ["📞", "Phone Numbers", TRUST.phones],
                ["✉️", "Email", ["themhezatrust@gmail.com"]],
                ["🌐", "Website", [TRUST.website]],
                ["🕗", "Office Hours", ["Mon–Fri: 08:00–17:00", "Sat: 09:00–13:00", "Sun & public holidays: closed"]],
              ].map(([icon, title, lines]) => (
                <div key={title} className="card p-5">
                  <span className="text-2xl" aria-hidden>{icon}</span>
                  <h3 className="mt-2 font-bold text-forest-900">{title}</h3>
                  {lines.map((l) => <p key={l} className="text-sm text-gray-600 mt-0.5">{l}</p>)}
                </div>
              ))}
            </div>

            <div className="card overflow-hidden">
              <iframe
                title="Map showing Cove Ridge East, Buffalo City, Eastern Cape"
                src="https://www.openstreetmap.org/export/embed.html?bbox=27.7%2C-32.9%2C28.1%2C-32.7&layer=mapnik&marker=-32.8%2C27.9"
                className="h-72 w-full border-0"
                loading="lazy"
              />
              <div className="p-3 text-xs text-gray-500 text-center">
                Approximate location: Cove Ridge East, Buffalo City. Exact farm entrance coordinates shared when booking a viewing.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Register interest + viewing */}
      <section className="py-14 bg-earth-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid gap-10 lg:grid-cols-2">
          <div id="register" className="card p-6 md:p-8">
            <h2 className="text-xl font-bold text-forest-900 mb-1">Register Your Interest</h2>
            <p className="text-sm text-gray-500 mb-5">Receive news about promotions, price changes, and new projects.</p>
            <InterestForm kind="REGISTER" />
          </div>
          <div id="viewing" className="card p-6 md:p-8">
            <h2 className="text-xl font-bold text-forest-900 mb-1">Schedule a Site Viewing</h2>
            <p className="text-sm text-gray-500 mb-5">
              Walk the land before you buy. Viewings run every Saturday, and mid-week visits can be arranged.
            </p>
            <InterestForm kind="VIEWING" />
          </div>
        </div>
      </section>
    </>
  );
}
