"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useCurrentUser } from "@/components/UserProvider";
import {
  DOCUMENT_TYPES, PaginationBar, StatusBadge, StockStatusBadge, TypeBadge,
  formatDate, locationLabel, typeLabel,
} from "@/components/stock";
import { Alert, Button, Field, PageHeader, Select, Spinner, Table, TableMessage, td, th } from "@/components/ui";
import {
  api, type Category, type DashboardData, type DocumentRow, type LocationOption,
  type Pagination, type Warehouse,
} from "@/lib/client/api";
import { MovesChart } from "./MovesChart";

const FILTER_KEYS = ["type", "status", "warehouse", "location", "category"] as const;
const STATUS_OPTIONS = [
  ["OPEN", "Pending (not done)"],
  ["DRAFT", "Draft"],
  ["WAITING", "Waiting"],
  ["READY", "Ready"],
  ["DONE", "Done"],
  ["CANCELED", "Canceled"],
] as const;

/** Where a document row links to. */
const documentHref = (d: DocumentRow) => (d.type === "INTERNAL" ? `/transfers/${d.id}` : `/moves?document=${d.id}`);

/**
 * The landing dashboard:
 *   1. KPI cards, each a deep link to the filtered list behind the number
 *   2. products needing reorder (out of stock first, then low)
 *   3. a 7-day activity chart
 *   4. document activity with combinable filters kept in the URL
 */
export function DashboardView() {
  const user = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [data, setData] = useState<DashboardData | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);

  // KPIs: fetched once per visit. The browser's UTC offset makes "last 7
  // days" the viewer's calendar days.
  useEffect(() => {
    api<DashboardData>(`/api/dashboard?tz=${new Date().getTimezoneOffset()}`)
      .then(setData)
      .catch((e) => setDataError(e.message));
  }, []);

  const k = data?.kpis;
  const cards = [
    { label: "Products in stock", value: k?.productsInStock, sub: k && `of ${k.totalProducts} products`, href: "/products?stock=in" },
    { label: "Low stock", value: k?.lowStock, sub: "at or below reorder level", href: "/products?stock=low", tone: k?.lowStock ? "amber" : undefined },
    { label: "Out of stock", value: k?.outOfStock, sub: "nothing on hand", href: "/products?stock=out", tone: k?.outOfStock ? "red" : undefined },
    { label: "Pending receipts", value: k?.pendingReceipts, sub: "not yet received", href: "/dashboard?type=RECEIPT&status=OPEN#activity" },
    { label: "Pending deliveries", value: k?.pendingDeliveries, sub: "not yet shipped", href: "/dashboard?type=DELIVERY&status=OPEN#activity" },
    { label: "Transfers scheduled", value: k?.scheduledTransfers, sub: "awaiting validation", href: "/dashboard?type=INTERNAL&status=OPEN#activity" },
  ];
  const reorder = data ? [...data.outOfStock, ...data.lowStock] : null;

  return (
    <>
      <PageHeader title="Dashboard" description={`Welcome back, ${user.name}. Every number here is derived from the stock-move ledger.`} />

      {dataError && <div className="mb-4"><Alert>{dataError}</Alert></div>}

      {/* 1. KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={`group rounded-lg border p-4 transition hover:shadow-sm ${
              c.tone === "red"
                ? "border-red-300 dark:border-red-900"
                : c.tone === "amber"
                  ? "border-amber-300 dark:border-amber-900"
                  : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
            }`}
          >
            <p className="flex items-center gap-1 text-xs font-medium text-zinc-500">
              {c.tone && <span aria-hidden className={c.tone === "red" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}>▲</span>}
              {c.label}
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">{c.value ?? <Spinner label="" />}</p>
            <p className="mt-1 text-xs text-zinc-500 group-hover:underline">{c.sub ?? " "}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        {/* 2. Reorder table */}
        {/* min-w-0: grid items default to min-width:auto, which would let the
            table push the column (and the page) wider than a phone screen. */}
        <section className="min-w-0 lg:col-span-3">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Needs reorder</h2>
            <Link href="/products?stock=alert" className="text-sm text-zinc-500 hover:underline">View all</Link>
          </div>
          <Table
            head={
              <tr>
                <th className={th}>Product</th>
                <th className={`${th} text-right`}>On hand</th>
                <th className={`${th} text-right`}>Reorder at</th>
                <th className={`${th} text-right`}>Short by</th>
                <th className={th}>Status</th>
              </tr>
            }
          >
            {!reorder ? (
              <TableMessage colSpan={5}><Spinner /></TableMessage>
            ) : reorder.length === 0 ? (
              <TableMessage colSpan={5}>✓ Everything is above its reorder level.</TableMessage>
            ) : (
              reorder.slice(0, 8).map((p) => (
                <tr key={p.id} className={p.status === "OUT" ? "bg-red-50/60 dark:bg-red-950/30" : "bg-amber-50/60 dark:bg-amber-950/20"}>
                  <td className={td}>
                    <Link href={`/products/${p.id}`} className="hover:underline">
                      <span className="font-medium">{p.name}</span>{" "}
                      <span className="font-mono text-xs text-zinc-500">{p.sku}</span>
                    </Link>
                    <span className="block text-xs text-zinc-500">{p.category.name}</span>
                  </td>
                  <td className={`${td} text-right font-medium tabular-nums`}>{p.onHand} {p.unitOfMeasure}</td>
                  <td className={`${td} text-right tabular-nums text-zinc-600 dark:text-zinc-400`}>{p.reorderLevel}</td>
                  <td className={`${td} text-right tabular-nums`}>{p.shortfall > 0 ? p.shortfall : "—"}</td>
                  <td className={td}><StockStatusBadge status={p.status} /></td>
                </tr>
              ))
            )}
          </Table>
        </section>

        {/* 3. Chart */}
        <section className="min-w-0 lg:col-span-2">
          {data ? <MovesChart days={data.movesLast7Days} /> : <Spinner />}
        </section>
      </div>

      {/* 4. Activity with filters */}
      <ActivitySection
        params={params}
        onChange={(changes) => {
          const next = new URLSearchParams(params);
          for (const [key, v] of Object.entries(changes)) {
            if (v === "") next.delete(key);
            else next.set(key, String(v));
          }
          if (!("page" in changes)) next.delete("page");
          router.replace(`${pathname}${next.size ? `?${next}` : ""}#activity`, { scroll: false });
        }}
        onClear={() => router.replace(`${pathname}#activity`, { scroll: false })}
      />
    </>
  );
}

function ActivitySection({
  params,
  onChange,
  onClear,
}: {
  params: URLSearchParams;
  onChange: (changes: Record<string, string | number>) => void;
  onClear: () => void;
}) {
  const f = Object.fromEntries(FILTER_KEYS.map((key) => [key, params.get(key) ?? ""])) as Record<(typeof FILTER_KEYS)[number], string>;

  const [options, setOptions] = useState<{ warehouses: Warehouse[]; locations: LocationOption[]; categories: Category[] } | null>(null);
  const [rows, setRows] = useState<{ documents: DocumentRow[]; pagination: Pagination } | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<{ warehouses: Warehouse[] }>("/api/warehouses"),
      api<{ locations: LocationOption[] }>("/api/locations"),
      api<{ categories: Category[] }>("/api/categories"),
    ])
      .then(([w, l, c]) => setOptions({ warehouses: w.warehouses, locations: l.locations, categories: c.categories }))
      .catch((e) => setError(e.message));
  }, []);

  // Refetch whenever any filter (or the page) changes; filters combine (AND).
  const queryString = new URLSearchParams(
    [...FILTER_KEYS, "page"].flatMap((key) => (params.get(key) ? [[key, params.get(key)!]] : []))
  ).toString();
  useEffect(() => {
    const ctrl = new AbortController();
    api<{ documents: DocumentRow[]; pagination: Pagination }>(`/api/documents?${queryString}`, { signal: ctrl.signal })
      .then((r) => { setRows(r); setError(null); setLoadedKey(queryString); })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setError(e.message);
        setLoadedKey(queryString);
      });
    return () => ctrl.abort();
  }, [queryString]);

  const loading = loadedKey !== queryString;
  const active = FILTER_KEYS.some((key) => f[key]);
  // Narrow the location list to the chosen warehouse.
  const locationChoices = options?.locations.filter((l) => !f.warehouse || l.warehouse?.id === f.warehouse) ?? [];

  return (
    <section id="activity" className="mt-8 scroll-mt-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">Document activity</h2>
        <div className="flex items-center gap-3 text-sm">
          {loading && rows && <Spinner label="Updating…" />}
          {active && <Button variant="ghost" onClick={onClear}>Clear filters</Button>}
        </div>
      </div>

      {/* Filters in one row above the list. */}
      <div className="mb-3 grid gap-3 rounded-lg border border-zinc-200 p-3 sm:grid-cols-3 lg:grid-cols-5 dark:border-zinc-800">
        <Field label="Type">
          <Select value={f.type} onChange={(e) => onChange({ type: e.target.value })}>
            <option value="">All types</option>
            {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={f.status} onChange={(e) => onChange({ status: e.target.value })}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </Select>
        </Field>
        <Field label="Warehouse">
          <Select value={f.warehouse} onChange={(e) => onChange({ warehouse: e.target.value, location: "" })}>
            <option value="">All warehouses</option>
            {options?.warehouses.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
          </Select>
        </Field>
        <Field label="Location">
          <Select value={f.location} onChange={(e) => onChange({ location: e.target.value })}>
            <option value="">All locations</option>
            {locationChoices.map((l) => <option key={l.id} value={l.id}>{locationLabel(l)}</option>)}
          </Select>
        </Field>
        <Field label="Product category">
          <Select value={f.category} onChange={(e) => onChange({ category: e.target.value })}>
            <option value="">All categories</option>
            {options?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
      </div>

      {error && <div className="mb-3"><Alert onClose={() => setError(null)}>{error}</Alert></div>}

      <Table
        head={
          <tr>
            <th className={th}>Reference</th>
            <th className={th}>Type</th>
            <th className={th}>From → To</th>
            <th className={th}>Products</th>
            <th className={`${th} text-right`}>Qty</th>
            <th className={th}>Status</th>
            <th className={th}>Created</th>
          </tr>
        }
      >
        {!rows ? (
          <TableMessage colSpan={7}><Spinner /></TableMessage>
        ) : rows.documents.length === 0 ? (
          <TableMessage colSpan={7}>{active ? "No documents match these filters." : "No documents yet."}</TableMessage>
        ) : (
          rows.documents.map((d) => (
            <tr key={d.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
              <td className={`${td} whitespace-nowrap font-mono text-xs`}>
                <Link href={documentHref(d)} className="font-medium hover:underline" title={d.note || undefined}>{d.reference}</Link>
              </td>
              <td className={td}><TypeBadge type={d.type} /></td>
              <td className={`${td} whitespace-nowrap`}>{d.sourceLocation?.name ?? "—"} → {d.destLocation?.name ?? "—"}</td>
              <td className={`${td} font-mono text-xs text-zinc-600 dark:text-zinc-400`}>{d.productsSummary}</td>
              <td className={`${td} text-right tabular-nums`}>{d.totalQuantity}</td>
              <td className={td}><StatusBadge status={d.status} /></td>
              <td className={`${td} whitespace-nowrap text-zinc-600 dark:text-zinc-400`}>{formatDate(d.createdAt)}</td>
            </tr>
          ))
        )}
      </Table>
      {rows && <PaginationBar pagination={rows.pagination} onPage={(p) => onChange({ page: p })} disabled={loading} />}
    </section>
  );
}
