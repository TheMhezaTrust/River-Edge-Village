// Hand-drawn icon set for the member portal. The app has no icon dependency and
// the workstation uses emoji, but emoji render differently on every phone a member
// signs in from, so the portal uses inline SVG paths instead.
const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export const HomeIcon = (p) => (
  <svg {...base} {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9.5 21v-6h5v6" /></svg>
);

export const UserIcon = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" /></svg>
);

export const UsersIcon = (p) => (
  <svg {...base} {...p}><circle cx="9" cy="8" r="3.2" /><path d="M2.8 20c1-3.2 3.4-4.9 6.2-4.9S14.2 16.8 15.2 20" /><path d="M16.2 5.4a3.2 3.2 0 0 1 0 6.2" /><path d="M17.8 15.4c2 .6 3.3 2.2 3.9 4.6" /></svg>
);

export const MapPinIcon = (p) => (
  <svg {...base} {...p}><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" /><circle cx="12" cy="10" r="2.6" /></svg>
);

export const ReceiptIcon = (p) => (
  <svg {...base} {...p}><path d="M5.5 3.5h13v17l-2.2-1.5-2.2 1.5-2.1-1.5-2.2 1.5-2.1-1.5-2.2 1.5Z" /><path d="M9 8.5h6M9 12.5h6" /></svg>
);

export const PrinterIcon = (p) => (
  <svg {...base} {...p}><path d="M7 9V3.5h10V9" /><rect x="3.5" y="9" width="17" height="7" rx="1.5" /><path d="M7 14h10v6.5H7Z" /></svg>
);

export const LockIcon = (p) => (
  <svg {...base} {...p}><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" /><path d="M12 14.5v2.5" /></svg>
);

export const LogOutIcon = (p) => (
  <svg {...base} {...p}><path d="M15 4.5h3.5a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H15" /><path d="M10 8 6 12l4 4" /><path d="M6 12h9" /></svg>
);

export const MenuIcon = (p) => (
  <svg {...base} {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);
