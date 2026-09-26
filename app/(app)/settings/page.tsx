import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata = { title: "Settings · StockSense" };

const SECTIONS = [
  {
    href: "/settings/warehouses",
    title: "Warehouses & locations",
    body: "Warehouses, their internal locations (shelves, zones) and the virtual vendor / customer / inventory-loss locations.",
  },
  {
    href: "/settings/reordering",
    title: "Reordering rules",
    body: "Reorder level per product. Low-stock alerts fire when total on-hand falls to or below it.",
  },
  {
    href: "/categories",
    title: "Categories",
    body: "Product groups used for filtering, reporting and the dashboard.",
  },
  {
    href: "/profile",
    title: "My profile",
    body: "Your name and password.",
  },
];

/** Settings home: entry points to configuration pages. */
export default async function SettingsPage() {
  const user = await getCurrentUser();
  return (
    <>
      <PageHeader
        title="Settings"
        description={user?.role === "MANAGER" ? "Configure how StockSense models your inventory." : "View configuration. Only managers can change settings."}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-lg border border-zinc-200 p-5 transition hover:border-zinc-400 hover:shadow-sm dark:border-zinc-800 dark:hover:border-zinc-600"
          >
            <h2 className="font-semibold tracking-tight">{s.title} →</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{s.body}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
