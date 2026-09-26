import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { FeedbackProvider } from "@/components/feedback";
import { UserProvider } from "@/components/UserProvider";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Shell for every signed-in page (sidebar + top bar, toasts, confirm dialogs).
 *
 * proxy.ts has already bounced anonymous visitors to /login; here we load the
 * full user from the DB once (which also catches revoked sessions) and hand it
 * to client components via context, so any page can ask "is this a manager?"
 * to show or hide write buttons. That's UX only: the API enforces roles
 * independently.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  // Signed-but-revoked cookie (password changed, user deleted): clear it via
  // a route handler, otherwise proxy.ts and this layout redirect in a loop.
  if (!user) redirect("/api/auth/expired");

  return (
    <UserProvider user={user}>
      <FeedbackProvider>
        <AppShell user={user}>{children}</AppShell>
      </FeedbackProvider>
    </UserProvider>
  );
}
