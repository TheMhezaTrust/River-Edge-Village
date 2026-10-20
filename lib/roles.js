export const SUPER_ADMIN = "SUPER_ADMIN";

// SUPER_ADMIN is a backend-only designation: it must read exactly like ADMIN
// everywhere a role label is rendered, so the public site and the workstation
// never reveal which account holds it.
export const ROLES = {
  SUPER_ADMIN: "Administrator",
  ADMIN: "Administrator",
  FINANCE_ADMIN: "Finance Admin",
  FINANCE: "Finance & Member Records",
  PLOTS: "Plot Administrator",
};

// Roles an administrator may hand out from Settings. SUPER_ADMIN is deliberately
// absent — it is assigned by lib/super-admin.js, not through the UI or the API.
export const ASSIGNABLE_ROLES = Object.fromEntries(
  Object.entries(ROLES).filter(([key]) => key !== SUPER_ADMIN)
);

export function isAdminRole(role) {
  return role === SUPER_ADMIN || role === "ADMIN";
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

// Every staff role can open and read every module; only writes are restricted.
const VIEW_ALL = ALL_PERMS.filter((p) => p.endsWith(":view"));

export const ROLE_PERMISSIONS = {
  SUPER_ADMIN: [...ALL_PERMS, FINANCE_ADMIN_ONLY],
  ADMIN: ALL_PERMS,
  // Focused on the money: reads everything, writes the ledger and payroll. It does
  // not carry payments:correct — rewriting a payment a member has already made stays
  // an administrator power — nor member or content management.
  FINANCE_ADMIN: [
    ...VIEW_ALL,
    FINANCE_ADMIN_ONLY,
    "finance:manage", "payroll:manage",
  ],
  FINANCE: [
    ...VIEW_ALL,
    "finance:manage", "payroll:manage",
    "members:manage", "inquiries:manage",
    "documents:manage",
    "communication:manage", "announcements:manage",
    "tasks:manage",
  ],
  PLOTS: [...VIEW_ALL, "plots:manage", "tasks:manage"],
};

export function can(user, permission) {
  if (!user) return false;
  return (ROLE_PERMISSIONS[user.role] || []).includes(permission);
}
