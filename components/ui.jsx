import { STATUS_LABELS } from "@/lib/format";

export function StatusPill({ status }) {
  const key = (status || "").toLowerCase().replace(/ /g, "_");
  return <span className={`pill pill-${key}`}>{STATUS_LABELS[status] || status}</span>;
}

export function SectionHeading({ eyebrow, title, subtitle, center = true, light = false }) {
  return (
    <div className={`mb-10 ${center ? "text-center mx-auto" : ""} max-w-3xl`}>
      {eyebrow && (
        <p className={`text-sm font-semibold uppercase tracking-wider mb-2 ${light ? "text-forest-300" : "text-sunset-500"}`}>{eyebrow}</p>
      )}
      <h2 className={`text-3xl md:text-4xl font-bold tracking-tight ${light ? "text-white" : "text-forest-900"}`}>{title}</h2>
      {subtitle && <p className={`mt-3 text-lg ${light ? "text-forest-100" : "text-gray-600"}`}>{subtitle}</p>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className={`relative bg-white rounded-xl shadow-2xl w-full ${wide ? "max-w-3xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl z-10">
          <h3 className="text-lg font-semibold text-forest-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none cursor-pointer" aria-label="Close">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, required, children, className = "" }) {
  return (
    <div className={className}>
      <label className="label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

export function Spinner({ className = "" }) {
  return (
    <div className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-forest-600 border-t-transparent ${className}`} role="status" aria-label="Loading" />
  );
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="text-center py-12">
      <p className="text-4xl mb-3" aria-hidden>🌱</p>
      <h3 className="text-lg font-semibold text-gray-800">{title || "Nothing here yet"}</h3>
      {message && <p className="text-gray-500 mt-1 text-sm">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Alert({ type = "error", children, onClose }) {
  const styles = {
    error: "bg-red-50 border-red-200 text-red-800",
    success: "bg-forest-50 border-forest-200 text-forest-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
  };
  return (
    <div className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${styles[type]}`} role={type === "error" ? "alert" : "status"}>
      <div>{children}</div>
      {onClose && (
        <button onClick={onClose} className="text-lg leading-none opacity-60 hover:opacity-100 cursor-pointer" aria-label="Dismiss">×</button>
      )}
    </div>
  );
}

export function StatCard({ label, value, sub, accent = "forest" }) {
  const accents = {
    forest: "text-forest-700",
    sunset: "text-sunset-500",
    trust: "text-trust-400",
    amber: "text-amber-600",
    red: "text-red-600",
  };
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accents[accent] || accents.forest}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}
