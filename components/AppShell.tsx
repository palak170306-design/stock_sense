"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { CurrentUser } from "@/lib/auth/session";
import { AlertsBadge } from "@/components/AlertsBadge";
import { LogoutButton } from "@/components/LogoutButton";

const NAV: { heading: string; links: { href: string; label: string }[] }[] = [
  { heading: "Overview", links: [{ href: "/dashboard", label: "Dashboard" }] },
  {
    heading: "Inventory",
    links: [
      { href: "/products", label: "Products" },
      { href: "/categories", label: "Categories" },
    ],
  },
  {
    heading: "Operations",
    links: [
      { href: "/transfers", label: "Transfers" },
      { href: "/adjustments", label: "Adjustments" },
      { href: "/moves", label: "Move history" },
    ],
  },
  {
    heading: "Settings",
    links: [
      { href: "/settings", label: "Settings" },
      { href: "/settings/warehouses", label: "Warehouses" },
      { href: "/settings/reordering", label: "Reordering rules" },
    ],
  },
];

/** Most specific match wins, so /settings/warehouses doesn't also light up /settings. */
function activeHref(pathname: string) {
  const all = NAV.flatMap((g) => g.links.map((l) => l.href)).concat("/profile");
  return all
    .filter((h) => pathname === h || pathname.startsWith(`${h}/`))
    .sort((a, b) => b.length - a.length)[0];
}

/**
 * Layout for every signed-in page: a left sidebar (navigation + profile +
 * logout) and a top bar (low-stock alerts, current user). Below the `lg`
 * breakpoint the sidebar becomes a slide-over drawer behind a menu button.
 */
export function AppShell({ user, children }: { user: CurrentUser; children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  // Close the mobile drawer after navigating (state adjusted during render).
  if (openedAt !== pathname) {
    setOpenedAt(pathname);
    setOpen(false);
  }
  const current = activeHref(pathname);

  const link = (href: string, label: string) => (
    <Link
      key={href}
      href={href}
      aria-current={current === href ? "page" : undefined}
      className={`block rounded-md px-3 py-1.5 text-sm transition ${
        current === href
          ? "bg-zinc-200/70 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
      }`}
    >
      {label}
    </Link>
  );

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link href="/dashboard" className="px-3 py-4 text-lg font-semibold tracking-tight">StockSense</Link>
      <nav className="flex-1 space-y-5 overflow-y-auto px-2" aria-label="Main">
        {NAV.map((group) => (
          <div key={group.heading}>
            <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">{group.heading}</p>
            <div className="space-y-0.5">{group.links.map((l) => link(l.href, l.label))}</div>
          </div>
        ))}
      </nav>
      {/* Profile menu */}
      <div className="border-t border-zinc-200 p-2 dark:border-zinc-800">
        <Link
          href="/profile"
          aria-current={current === "/profile" ? "page" : undefined}
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
            current === "/profile" ? "bg-zinc-200/70 dark:bg-zinc-800" : "hover:bg-zinc-100 dark:hover:bg-zinc-900"
          }`}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900" aria-hidden>
            {user.name.trim().charAt(0).toUpperCase() || "?"}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium">{user.name}</span>
            <span className="block text-xs text-zinc-500">{user.role === "MANAGER" ? "Manager" : "Staff"} · My profile</span>
          </span>
        </Link>
        <div className="mt-2 px-1"><LogoutButton className="w-full" /></div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-full flex-1">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-zinc-200 bg-zinc-50 lg:block dark:border-zinc-800 dark:bg-zinc-950">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-zinc-200 bg-zinc-50 shadow-xl dark:border-zinc-800 dark:bg-zinc-950" aria-label="Navigation">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-200 bg-white/90 px-4 py-2.5 backdrop-blur sm:px-6 dark:border-zinc-800 dark:bg-zinc-950/90">
          <button
            onClick={() => setOpen(true)}
            className="rounded-md p-1.5 hover:bg-zinc-100 lg:hidden dark:hover:bg-zinc-900"
            aria-label="Open navigation"
            aria-expanded={open}
          >
            <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
            </svg>
          </button>
          <Link href="/dashboard" className="font-semibold tracking-tight lg:hidden">StockSense</Link>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <AlertsBadge />
            <Link href="/profile" className="hidden text-zinc-600 hover:text-zinc-900 sm:inline dark:text-zinc-400 dark:hover:text-zinc-100">
              {user.name} · {user.role.toLowerCase()}
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
