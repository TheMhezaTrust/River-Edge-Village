"use client";

import { createContext, useContext, useMemo } from "react";
import { can as canDo } from "@/lib/roles";

const PermissionsContext = createContext({ user: null, can: () => false });

export function PermissionsProvider({ user, children }) {
  const value = useMemo(() => ({ user, can: (permission) => canDo(user, permission) }), [user]);
  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions() {
  return useContext(PermissionsContext);
}

export function ReadOnlyNote({ label = "this module" }) {
  return (
    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      Read-only view — your role can see {label}, but changes are restricted. Ask an Administrator if you need edit access.
    </p>
  );
}
