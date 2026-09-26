"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { CurrentUser } from "@/lib/auth/session";

const UserContext = createContext<CurrentUser | null>(null);

/** Makes the signed-in user available to client components. */
export function UserProvider({ user, children }: { user: CurrentUser; children: ReactNode }) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useCurrentUser(): CurrentUser {
  const user = useContext(UserContext);
  if (!user) throw new Error("useCurrentUser must be used inside <UserProvider>");
  return user;
}

/**
 * Whether the UI should offer create/edit/delete actions.
 * UX only: STAFF simply don't see buttons that would get a 403 from the API.
 */
export function useCanEdit(): boolean {
  return useCurrentUser().role === "MANAGER";
}
