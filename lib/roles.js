export const ROLES = {
  ADMIN: "Administrator",
  FINANCE: "Finance & Member Records",
  PLOTS: "Plot Administrator",
};

const ALL_PERMS = [
  "members:view", "members:manage",
  "plots:view", "plots:manage",
  "finance:view", "finance:manage",
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

// Every staff role can open and read every module; only writes are restricted.
const VIEW_ALL = ALL_PERMS.filter((p) => p.endsWith(":view"));

export const ROLE_PERMISSIONS = {
  ADMIN: ALL_PERMS,
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
