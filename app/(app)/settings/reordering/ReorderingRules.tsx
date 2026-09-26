"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/feedback";
import { PaginationBar, StockStatusBadge } from "@/components/stock";
import { useCanEdit } from "@/components/UserProvider";
import { Alert, Button, Input, PageHeader, Spinner, Table, TableMessage, td, th } from "@/components/ui";
import { api, type Pagination, type Product } from "@/lib/client/api";

/**
 * Reorder levels for every product on one page, next to current stock, so a
 * manager can tune low-stock alerts without opening each product. Each row
 * saves on its own (PATCH /api/products/:id { reorderLevel }).
 */
export function ReorderingRules() {
  const canEdit = useCanEdit();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ products: Product[]; pagination: Pagination } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({}); // productId → edited value
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ products: Product[]; pagination: Pagination }>(`/api/products?limit=25&page=${page}`)
      .then((r) => { setData(r); setError(null); })
      .catch((e) => setError(e.message));
  }, [page]);
  useEffect(load, [load]);

  async function save(p: Product) {
    const value = drafts[p.id];
    setSaving(p.id);
    try {
      await api(`/api/products/${p.id}`, { method: "PATCH", body: { reorderLevel: value } });
      toast.success(`${p.sku}: reorder level set to ${value}`);
      setDrafts(({ [p.id]: _, ...rest }) => { void _; return rest; });
      load(); // refresh status badges
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Reordering rules"
        description="A product is Low stock when its total on-hand is at or below its reorder level, and Out of stock at zero."
      />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}

      <Table
        head={
          <tr>
            <th className={th}>Product</th>
            <th className={th}>Category</th>
            <th className={`${th} text-right`}>On hand</th>
            <th className={th}>Status</th>
            <th className={`${th} w-48`}>Reorder level</th>
          </tr>
        }
      >
        {!data ? (
          <TableMessage colSpan={5}><Spinner /></TableMessage>
        ) : data.products.length === 0 ? (
          <TableMessage colSpan={5}>
            No products yet. <Link href="/products/new" className="underline">Add one</Link> to set its reorder level.
          </TableMessage>
        ) : (
          data.products.map((p) => {
            const draft = drafts[p.id];
            const dirty = draft !== undefined && draft !== String(p.reorderLevel);
            const invalid = dirty && !/^\d+$/.test(draft);
            return (
              <tr key={p.id}>
                <td className={td}>
                  <Link href={`/products/${p.id}`} className="hover:underline">
                    <span className="font-medium">{p.name}</span> <span className="font-mono text-xs text-zinc-500">{p.sku}</span>
                  </Link>
                </td>
                <td className={td}>{p.category.name}</td>
                <td className={`${td} text-right tabular-nums`}>{p.onHand} {p.unitOfMeasure}</td>
                <td className={td}>{p.stockStatus && <StockStatusBadge status={p.stockStatus} />}</td>
                <td className={td}>
                  {canEdit ? (
                    <form
                      className="flex gap-2"
                      onSubmit={(e) => { e.preventDefault(); if (dirty && !invalid) save(p); }}
                    >
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={draft ?? p.reorderLevel}
                        onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                        aria-label={`Reorder level for ${p.sku}`}
                        aria-invalid={invalid}
                        className="w-24"
                      />
                      <Button type="submit" variant={dirty ? "primary" : "secondary"} disabled={!dirty || invalid || saving === p.id}>
                        {saving === p.id ? "…" : "Save"}
                      </Button>
                    </form>
                  ) : (
                    <span className="tabular-nums">{p.reorderLevel} {p.unitOfMeasure}</span>
                  )}
                </td>
              </tr>
            );
          })
        )}
      </Table>
      {data && <PaginationBar pagination={data.pagination} onPage={setPage} />}
    </>
  );
}
