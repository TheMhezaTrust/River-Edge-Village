import Link from "next/link";

// The chrome around every "View as Member" preview screen. It replaces the member's own
// PortalShell: an amber banner makes it unmistakable that a staff user is looking at a
// member's portal read-only, and a nav row mirrors the member sidebar so the administrator
// can move between the same sections. It is deliberately NOT the PortalShell — that one is
// a client component wired to the member's heartbeat/idle-timeout session, which a preview
// must never start.
const SECTIONS = [
  { key: "dashboard", label: "Dashboard", path: "" },
  { key: "profile", label: "My Profile", path: "/profile" },
  { key: "payments", label: "Payments & Statement", path: "/payments" },
  { key: "plot", label: "My Plot Details", path: "/plot" },
  { key: "beneficiaries", label: "My Beneficiaries", path: "/beneficiaries" },
  { key: "documents", label: "My Certificate", path: "/documents" },
  { key: "statement", label: "Statement", path: "/statement" },
];

export default function PreviewShell({ member, active, children }) {
  const base = `/workstation/preview/${member.id}`;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="sticky top-0 z-40 border-b border-amber-300 bg-amber-50 print:hidden">
        <div className="mx-auto max-w-6xl px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Preview</span>
            <p className="text-sm font-medium text-amber-900">
              Viewing the member portal as <strong>{member.fullName}</strong>. This is read-only — nothing here is signed in as them.
            </p>
            <Link href={`/workstation/members/${member.id}`} className="btn-outline btn-sm ml-auto">← Exit preview</Link>
          </div>
        </div>
        <nav className="border-t border-amber-200">
          <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
            {SECTIONS.map((s) => {
              const isActive = s.key === active;
              return (
                <Link
                  key={s.key}
                  href={`${base}${s.path}`}
                  className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
                    isActive
                      ? "border-amber-500 text-amber-900"
                      : "border-transparent text-amber-700 hover:border-amber-300 hover:text-amber-900"
                  }`}
                >
                  {s.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
      <main className="mx-auto max-w-6xl p-4 lg:p-6 print:p-0">{children}</main>
    </div>
  );
}
