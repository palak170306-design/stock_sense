"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";

/**
 * Low-stock notification in the top nav: "▲ 2 to reorder", linking to the
 * product list filtered to items needing reorder.
 *
 * Re-fetched on every navigation (the header itself persists across client
 * navigations), so validating a transfer or booking an adjustment is
 * reflected as soon as you move to another page. Hidden when nothing needs
 * reordering. Red if anything is fully out of stock, amber otherwise.
 */
export function AlertsBadge() {
  const pathname = usePathname();
  const [counts, setCounts] = useState<{ count: number; outOfStock: number } | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    api<{ count: number; outOfStock: number }>("/api/alerts", { signal: ctrl.signal })
      .then(setCounts)
      .catch(() => {}); // a missing badge must never break the page
    return () => ctrl.abort();
  }, [pathname]);

  if (!counts || counts.count === 0) return null;

  const severe = counts.outOfStock > 0;
  return (
    <Link
      href="/products?stock=alert"
      title={`${counts.count} product(s) at or below reorder level${severe ? `, ${counts.outOfStock} out of stock` : ""}`}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition hover:opacity-80 ${
        severe
          ? "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          : "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
      }`}
    >
      <span aria-hidden>▲</span>
      <span className="tabular-nums">{counts.count}</span> to reorder
    </Link>
  );
}
