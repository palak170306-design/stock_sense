"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Logs out by asking the server to delete the httpOnly session cookie
 * (page JavaScript can't touch it), then goes to /login.
 */
export function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      // Navigate even if the request failed: the protected pages will
      // re-check the cookie and bounce to /login if it's still there.
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <button
      onClick={logout}
      disabled={pending}
      className={`rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-900 ${className}`}
    >
      {pending ? "Logging out…" : "Log out"}
    </button>
  );
}
