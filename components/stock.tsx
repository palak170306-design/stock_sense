"use client";

/**
 * Shared bits for the stock-operation pages: colour-coded badges, a
 * pagination bar, date formatting, and a hook that loads dropdown options.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { api, type DocumentType, type LocationOption, type MoveStatus, type Pagination, type Product } from "@/lib/client/api";

// One colour per operation, used everywhere a document type appears, so the
// ledger can be scanned by colour: green in, blue out, violet internal, amber corrections.
const TYPE_STYLES: Record<DocumentType, { label: string; className: string }> = {
  RECEIPT: { label: "Receipt", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  DELIVERY: { label: "Delivery", className: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" },
  INTERNAL: { label: "Transfer", className: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300" },
  ADJUSTMENT: { label: "Adjustment", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
};
export const DOCUMENT_TYPES = Object.keys(TYPE_STYLES) as DocumentType[];
export const typeLabel = (t: DocumentType) => TYPE_STYLES[t].label;

export function TypeBadge({ type }: { type: DocumentType }) {
  const s = TYPE_STYLES[type];
  return <span className={`inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ${s.className}`}>{s.label}</span>;
}

const STATUS_STYLES: Record<MoveStatus, string> = {
  DRAFT: "border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400",
  WAITING: "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400",
  READY: "border-sky-300 text-sky-700 dark:border-sky-800 dark:text-sky-400",
  DONE: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400",
  CANCELED: "border-zinc-200 text-zinc-400 line-through dark:border-zinc-800 dark:text-zinc-600",
};
export const MOVE_STATUSES = Object.keys(STATUS_STYLES) as MoveStatus[];

export function StatusBadge({ status }: { status: MoveStatus }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded border px-1.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

/**
 * Stock health badge. Status colours are reserved for state (never reused as
 * series colours) and always come with an icon + word, never colour alone.
 */
const STOCK_STATUS = {
  OUT: { icon: "✕", label: "Out of stock", className: "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300" },
  LOW: { icon: "▲", label: "Low stock", className: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300" },
  OK: { icon: "✓", label: "In stock", className: "border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400" },
} as const;

export function StockStatusBadge({ status }: { status: keyof typeof STOCK_STATUS }) {
  const s = STOCK_STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded border px-1.5 py-0.5 text-xs font-medium ${s.className}`}>
      <span aria-hidden>{s.icon}</span>
      {s.label}
    </span>
  );
}

const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
export const formatDate = (iso: string | null | undefined) => (iso ? dateFmt.format(new Date(iso)) : "—");

export function PaginationBar({ pagination, onPage, disabled }: { pagination: Pagination; onPage: (page: number) => void; disabled?: boolean }) {
  const { page, limit, total, totalPages } = pagination;
  if (total === 0) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
      <span>
        {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
      </span>
      <div className="flex items-center gap-2">
        <Button disabled={page <= 1 || disabled} onClick={() => onPage(page - 1)}>Previous</Button>
        <span>Page {page} / {totalPages}</span>
        <Button disabled={page >= totalPages || disabled} onClick={() => onPage(page + 1)}>Next</Button>
      </div>
    </div>
  );
}

/** "WH/Stock (WH)" style label for location dropdowns. */
export const locationLabel = (l: LocationOption) => (l.warehouse ? `${l.name} · ${l.warehouse.code}` : l.name);

/**
 * Load product + location options for dropdowns.
 * @param locationType restrict locations (e.g. "INTERNAL"); omit for all.
 */
export function useStockOptions(locationType?: "INTERNAL") {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [locations, setLocations] = useState<LocationOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      // 100 is the API's page cap; enough for dropdowns at this stage.
      api<{ products: Product[] }>("/api/products?limit=100"),
      api<{ locations: LocationOption[] }>(`/api/locations${locationType ? `?type=${locationType}` : ""}`),
    ])
      .then(([p, l]) => {
        setProducts(p.products);
        setLocations(l.locations);
      })
      .catch((e) => setError(e.message));
  }, [locationType]);

  return { products, locations, error };
}
