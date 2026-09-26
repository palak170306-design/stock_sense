"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  DOCUMENT_TYPES, MOVE_STATUSES, PaginationBar, StatusBadge, TypeBadge,
  formatDate, locationLabel, typeLabel, useStockOptions,
} from "@/components/stock";
import { Alert, Button, Field, Input, PageHeader, Select, Spinner, Table, TableMessage, td, th } from "@/components/ui";
import { api, type LedgerMove, type Pagination } from "@/lib/client/api";

const FILTER_KEYS = ["product", "location", "document", "type", "status", "from", "to"] as const;

/** Local calendar day "YYYY-MM-DD" → the UTC instant of its local midnight. */
function localMidnightIso(day: string, addDays = 0): string {
  const d = new Date(`${day}T00:00:00`);
  d.setDate(d.getDate() + addDays);
  return d.toISOString();
}

/**
 * The stock ledger: every move from every operation, filterable and paginated.
 * It's the single source of truth: for any product + location, summing the
 * Done rows here gives exactly the on-hand shown elsewhere.
 */
export function MoveHistory() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { products, locations, error: optionsError } = useStockOptions();

  const f = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? ""])) as Record<(typeof FILTER_KEYS)[number], string>;

  const [data, setData] = useState<{ moves: LedgerMove[]; pagination: Pagination } | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setFilter(changes: Record<string, string | number>) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v === "" || v === null) next.delete(k);
      else next.set(k, String(v));
    }
    if (!("page" in changes)) next.delete("page"); // new filter → back to page 1
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  }

  // Translate UI filters (local calendar days) into API params.
  const queryString = params.toString();
  useEffect(() => {
    const ctrl = new AbortController();
    const qs = new URLSearchParams(queryString);
    // "to" is inclusive in the UI, so send the NEXT local midnight as the
    // exclusive end instant.
    if (qs.get("from")) qs.set("from", localMidnightIso(qs.get("from")!));
    if (qs.get("to")) qs.set("to", localMidnightIso(qs.get("to")!, 1));
    api<{ moves: LedgerMove[]; pagination: Pagination }>(`/api/moves?${qs}`, { signal: ctrl.signal })
      .then((r) => { setData(r); setError(null); setLoadedKey(queryString); })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setError(e.message);
        setLoadedKey(queryString);
      });
    return () => ctrl.abort();
  }, [queryString]);

  const loading = loadedKey !== queryString;
  const active = FILTER_KEYS.some((k) => f[k]);

  return (
    <>
      <PageHeader
        title="Move history"
        description="Every stock movement from every operation: the ledger all stock levels are computed from."
      />

      <div className="mb-4 grid gap-3 rounded-lg border border-zinc-200 p-4 sm:grid-cols-3 lg:grid-cols-6 dark:border-zinc-800">
        <Field label="Product">
          <Select value={f.product} onChange={(e) => setFilter({ product: e.target.value })}>
            <option value="">All</option>
            {products?.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
          </Select>
        </Field>
        <Field label="Location">
          <Select value={f.location} onChange={(e) => setFilter({ location: e.target.value })}>
            <option value="">All</option>
            {locations?.map((l) => <option key={l.id} value={l.id}>{locationLabel(l)}</option>)}
          </Select>
        </Field>
        <Field label="Type">
          <Select value={f.type} onChange={(e) => setFilter({ type: e.target.value })}>
            <option value="">All</option>
            {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={f.status} onChange={(e) => setFilter({ status: e.target.value })}>
            <option value="">All</option>
            {MOVE_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
          </Select>
        </Field>
        <Field label="From">
          <Input type="date" value={f.from} max={f.to || undefined} onChange={(e) => setFilter({ from: e.target.value })} />
        </Field>
        <Field label="To">
          <Input type="date" value={f.to} min={f.from || undefined} onChange={(e) => setFilter({ to: e.target.value })} />
        </Field>
      </div>

      <div className="mb-4 flex min-h-8 flex-wrap items-center gap-3 text-sm">
        {f.document && data?.moves[0]?.document && (
          <span className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
            Document <span className="font-mono">{data.moves[0].document.reference}</span>
          </span>
        )}
        {active && <Button variant="ghost" onClick={() => router.replace(pathname)}>Clear filters</Button>}
        {loading && data && <Spinner label="Updating…" />}
      </div>

      {(error || optionsError) && <div className="mb-4"><Alert onClose={() => setError(null)}>{error ?? optionsError}</Alert></div>}

      <Table
        head={
          <tr>
            <th className={th}>Date</th>
            <th className={th}>Reference</th>
            <th className={th}>Type</th>
            <th className={th}>Product</th>
            <th className={th}>From → To</th>
            <th className={`${th} text-right`}>{f.location ? "In / Out" : "Quantity"}</th>
            <th className={th}>Status</th>
          </tr>
        }
      >
        {!data ? (
          <TableMessage colSpan={7}><Spinner /></TableMessage>
        ) : data.moves.length === 0 ? (
          <TableMessage colSpan={7}>{active ? "No moves match these filters." : "No stock moves yet."}</TableMessage>
        ) : (
          data.moves.map((m) => {
            // With a location filter, sign each move relative to that location.
            const sign = !f.location ? "" : m.destLocationId === f.location ? "+" : "−";
            const inactive = m.status === "CANCELED";
            return (
              <tr key={m.id} className={inactive ? "text-zinc-400 dark:text-zinc-600" : ""}>
                <td className={`${td} whitespace-nowrap`}>
                  {formatDate(m.date)}
                  {!m.doneAt && <span className="block text-xs text-zinc-400">created</span>}
                </td>
                <td className={`${td} whitespace-nowrap font-mono text-xs`}>
                  {m.document ? (
                    <Link
                      href={m.document.type === "INTERNAL" ? `/transfers/${m.document.id}` : `/moves?document=${m.document.id}`}
                      className="hover:underline"
                      title={m.document.note || undefined}
                    >
                      {m.document.reference}
                    </Link>
                  ) : m.reference || "—"}
                </td>
                <td className={td}><TypeBadge type={m.documentType} /></td>
                <td className={td}>
                  <Link href={`/products/${m.product.id}`} className="hover:underline">
                    <span className="font-mono text-xs">{m.product.sku}</span> {m.product.name}
                  </Link>
                </td>
                <td className={`${td} whitespace-nowrap`}>
                  <span className={m.sourceLocation.type === "INTERNAL" ? "" : "text-zinc-500"}>{m.sourceLocation.name}</span>
                  {" → "}
                  <span className={m.destLocation.type === "INTERNAL" ? "" : "text-zinc-500"}>{m.destLocation.name}</span>
                </td>
                <td
                  className={`${td} whitespace-nowrap text-right font-medium tabular-nums ${
                    sign === "+" ? "text-emerald-600 dark:text-emerald-400" : sign === "−" ? "text-red-600 dark:text-red-400" : ""
                  }`}
                >
                  {sign}{m.quantity} {m.product.unitOfMeasure}
                </td>
                <td className={td}><StatusBadge status={m.status} /></td>
              </tr>
            );
          })
        )}
      </Table>
      {data && <PaginationBar pagination={data.pagination} onPage={(p) => setFilter({ page: p })} disabled={loading} />}
      <p className="mt-3 text-xs text-zinc-500">
        Only <strong>Done</strong> moves change stock. Grey location names are virtual (vendors, customers, inventory loss).
      </p>
    </>
  );
}
