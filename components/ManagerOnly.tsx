import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { Alert } from "@/components/ui";

/**
 * Server-side wrapper for manager-only PAGES (e.g. /products/new). STAFF who
 * type the URL directly get a message instead of a form whose submit would
 * be rejected by the API anyway. The API's requireManager() is the real
 * enforcement; this just avoids a confusing dead-end.
 */
export async function ManagerOnly({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (user?.role !== "MANAGER") {
    return <Alert>Only managers can do this. Ask a manager if something needs changing.</Alert>;
  }
  return children;
}
