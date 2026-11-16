export const SUPER_ADMIN = "SUPER_ADMIN";

// The software owner's own auditing role. It sits above the Main Administrator in
// seniority but below it in reach: it can open every module and read everything,
// and it may write only to the Ad Manager (which is its own module). It is never
// assignable through the UI — lib/owner-account.js designates it from the
// environment, so no administrator can grant it to themselves.
export const VIEW963_OWNER = "VIEW963_OWNER";

// SUPER_ADMIN is a backend-only designation: it must read exactly like ADMIN
// everywhere a role label is rendered, so the public site and the workstation
// never reveal which account holds it.
export const ROLES = {
  VIEW963_OWNER: "Software Owner",
  SUPER_ADMIN: "Administrator",
  ADMIN: "Administrator",
  FINANCE_ADMIN: "Finance Admin",
  FINANCE: "Finance & Member Records",
  PLOTS: "Plot Administrator",
};

// Roles an administrator may hand out from Settings. SUPER_ADMIN and
// VIEW963_OWNER are deliberately absent — they are assigned by
// lib/super-admin.js and lib/owner-account.js, not through the UI or the API.
export const ASSIGNABLE_ROLES = Object.fromEntries(
  Object.entries(ROLES).filter(([key]) => key !== SUPER_ADMIN && key !== VIEW963_OWNER)
);

export function isAdminRole(role) {
  return role === SUPER_ADMIN || role === "ADMIN";
}

export function isOwnerRole(role) {
  return role === VIEW963_OWNER;
}

const ALL_PERMS = [
  "members:view", "members:manage",
  "plots:view", "plots:manage",
  "finance:view", "finance:manage",
  // Rewriting or deleting a payment that has already been captured changes the
  // Trust's recorded income, so it is deliberately not a :manage permission that
  // Finance & Member Records inherits — only the two administrator roles hold it.
  "payments:correct",
  "payroll:view", "payroll:manage",
  "documents:view", "documents:manage",
  "departments:view", "departments:manage",
  "inquiries:view", "inquiries:manage",
  // The member support desk. Every role may open the inbox, but what it shows is
  // scoped in the API: an administrator reads every ticket, anybody else only the
  // ones routed to them. Answering a member is the write, and it is held by the
  // roles the routing actually names — see lib/support.js.
  "support:view", "support:manage",
  "tasks:view", "tasks:manage",
  "communication:view", "communication:manage",
  "announcements:manage",
  "reports:view",
  "projects:view", "projects:manage",
  "users:view", "users:manage", "settings:manage", "audit:view",
];

// Deliberately NOT in ALL_PERMS, so an ordinary Administrator does not inherit it.
// Moving money between jars, changing an allocation percentage, logging an expense
// against the formal books and closing an accounting period are all held behind
// this, which only the Main Administrator and the Finance Admin role carry. Reading
// the books stays open to every role through finance:view.
const FINANCE_ADMIN_ONLY = "finance:admin";

// Reading the two tabs that publish to the public website. Kept out of ALL_PERMS
// so the money- and plot-focused roles still do not see them; the administrator
// roles and the software owner are granted them explicitly. Writing to either tab
// stays behind settings:manage, which the software owner does not hold.
const PUBLIC_CONTENT_VIEWS = ["content:view", "gallery:view"];

// The Ad Manager is the software owner's own module: no other role carries it.
const AD_PERMS = ["ads:view", "ads:manage"];

// Every staff role can open and read every module; only writes are restricted.
const VIEW_ALL = ALL_PERMS.filter((p) => p.endsWith(":view"));

export const ROLE_PERMISSIONS = {
  // Auditing reach, not managing reach: every module opens for reading and no
  // write permission is held at all, so every Save/Edit/Delete/Approve control the
  // UI gates on a permission disappears. middleware.js enforces the same rule on
  // the API for the few writes that were never permission-gated. The Ad Manager is
  // the single exception — it is the owner's own module.
  VIEW963_OWNER: [...VIEW_ALL, ...PUBLIC_CONTENT_VIEWS, ...AD_PERMS],
  SUPER_ADMIN: [...ALL_PERMS, FINANCE_ADMIN_ONLY, ...PUBLIC_CONTENT_VIEWS],
  ADMIN: [...ALL_PERMS, ...PUBLIC_CONTENT_VIEWS],
  // Focused on the money: reads everything, writes the ledger and payroll. It does
  // not carry payments:correct — rewriting a payment a member has already made stays
  // an administrator power — nor member or content management.
  FINANCE_ADMIN: [
    ...VIEW_ALL,
    FINANCE_ADMIN_ONLY,
    "finance:manage", "payroll:manage",
    "support:manage",
  ],
  FINANCE: [
    ...VIEW_ALL,
    "finance:manage", "payroll:manage",
    "members:manage", "inquiries:manage",
    "documents:manage",
    "communication:manage", "announcements:manage",
    "tasks:manage",
    "support:manage",
  ],
  PLOTS: [...VIEW_ALL, "plots:manage", "tasks:manage", "support:manage"],
};

export function can(user, permission) {
  if (!user) return false;
  return (ROLE_PERMISSIONS[user.role] || []).includes(permission);
}
