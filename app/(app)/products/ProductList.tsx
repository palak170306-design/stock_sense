"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useConfirm, useToast } from "@/components/feedback";
import { useCanEdit } from "@/components/UserProvider";
import { StockStatusBadge } from "@/components/stock";
import { Alert, Button, ButtonLink, Input, PageHeader, Select, Spinner, Table, TableMessage, td, th } from "@/components/ui";
import { api, type Category, type Pagination, type Product } from "@/lib/client/api";

/**
 * Product table with search, category filter and pagination.
 *
 * The URL is the source of truth for the filters (?q=&category=&page=), so a
 * filtered view can be bookmarked/shared and the back button works. Typing in
 * the search box updates the URL after a short pause (debounce) instead of on
 * every keystroke, which would fire a request per character.
 */
export function ProductList() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const canEdit = useCanEdit();
  const toast = useToast();
  const confirm = useConfirm();

  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const stock = params.get("stock") ?? "";
  const page = Number(params.get("page") ?? 1) || 1;

  const [search, setSearch] = useState(q);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  // Which request the current table data belongs to. "Loading" is derived by
  // comparing it with the request we want now, so no setState is needed when
  // a fetch starts.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  /** Merge changes into the query string. Any filter change resets to page 1. */
  function updateParams(changes: Record<string, string | number | null>) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, String(v));
    }
    if (!("page" in changes)) next.delete("page");
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  }

  // Debounce: push the search box into the URL 300ms after typing stops.
  useEffect(() => {
    if (search.trim() === q) return;
    const t = setTimeout(() => updateParams({ q: search.trim() }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Keep the box in sync when the URL changes from elsewhere (back button).
  // Adjusting state during render (not in an effect) is React's recommended
  // pattern for "reset state when a prop changes".
  const [prevQ, setPrevQ] = useState(q);
  if (q !== prevQ) {
    setPrevQ(q);
    if (q !== search.trim()) setSearch(q);
  }

  // Category options for the filter dropdown (loaded once).
  useEffect(() => {
    api<{ categories: Category[] }>("/api/categories")
      .then((r) => setCategories(r.categories))
      .catch((e) => setError(e.message));
  }, []);

  // Fetch the current page whenever the URL filters change. AbortController
  // cancels a slow earlier request so its result can't overwrite a newer one.
  const queryString = params.toString();
  const requestKey = `${queryString}#${reload}`;
  const loading = loadedKey !== requestKey;
  useEffect(() => {
    const ctrl = new AbortController();
    api<{ products: Product[]; pagination: Pagination }>(`/api/products?${queryString}&limit=10`, { signal: ctrl.signal })
      .then((r) => {
        setProducts(r.products);
        setPagination(r.pagination);
        setError(null);
        setLoadedKey(requestKey);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setError(e.message);
        setLoadedKey(requestKey); // stop the spinner; the error explains why
      });
    return () => ctrl.abort();
  }, [queryString, reload, requestKey]);

  async function remove(p: Product) {
    const ok = await confirm({
      title: `Delete ${p.name}?`,
      body: `${p.sku} will be removed permanently. Products with stock history can't be deleted.`,
      confirmLabel: "Delete product",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await api(`/api/products/${p.id}`, { method: "DELETE" });
      toast.success(`Deleted ${p.sku}`);
      // Deleting the last row on a page: step back a page instead of showing an empty one.
      if (products?.length === 1 && page > 1) updateParams({ page: page - 1 });
      else setReload((n) => n + 1);
    } catch (e) {
      // e.g. "Can't delete … it has 3 stock move(s) in its history."
      toast.error((e as Error).message);
    }
  }

  const cols = canEdit ? 7 : 6;
  const filtered = q !== "" || category !== "" || stock !== "";

  return (
    <>
      <PageHeader
        title="Products"
        description="Catalogue of everything you stock. Quantities come from stock moves."
        actions={canEdit && <ButtonLink href="/products/new" variant="primary">+ Add product</ButtonLink>}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          type="search"
          placeholder="Search by name or SKU…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search products"
          className="sm:max-w-xs"
        />
        <Select
          value={category}
          onChange={(e) => updateParams({ category: e.target.value })}
          aria-label="Filter by category"
          className="sm:max-w-[14rem]"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <Select
          value={stock}
          onChange={(e) => updateParams({ stock: e.target.value })}
          aria-label="Filter by stock status"
          className="sm:max-w-[12rem]"
        >
          <option value="">Any stock level</option>
          <option value="in">In stock</option>
          <option value="alert">Needs reorder</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </Select>
        {loading && products && <Spinner label="Updating…" />}
      </div>

      {error && <div className="mb-4"><Alert onClose={() => setError(null)}>{error}</Alert></div>}

      <Table
        head={
          <tr>
            <th className={th}>SKU</th>
            <th className={th}>Name</th>
            <th className={th}>Category</th>
            <th className={th}>Unit</th>
            <th className={`${th} text-right`}>On hand</th>
            <th className={`${th} text-right`}>Reorder level</th>
            {canEdit && <th className={`${th} text-right`}>Actions</th>}
          </tr>
        }
      >
        {products === null ? (
          <TableMessage colSpan={cols}><Spinner /></TableMessage>
        ) : products.length === 0 ? (
          <TableMessage colSpan={cols}>
            {filtered ? "No products match these filters." : (
              <>No products yet.{canEdit && <> <Link href="/products/new" className="font-medium underline">Add your first product</Link>.</>}</>
            )}
          </TableMessage>
        ) : (
          products.map((p) => (
            <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
              <td className={`${td} font-mono text-xs`}>{p.sku}</td>
              <td className={td}>
                <Link href={`/products/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
              </td>
              <td className={td}>{p.category.name}</td>
              <td className={td}>{p.unitOfMeasure}</td>
              <td className={`${td} whitespace-nowrap text-right tabular-nums`}>
                <span className="mr-2">{p.onHand ?? 0}</span>
                {p.stockStatus && p.stockStatus !== "OK" && <StockStatusBadge status={p.stockStatus} />}
              </td>
              <td className={`${td} text-right tabular-nums`}>{p.reorderLevel}</td>
              {canEdit && (
                <td className={`${td} whitespace-nowrap text-right`}>
                  <div className="inline-flex gap-2">
                    <ButtonLink href={`/products/${p.id}/edit`}>Edit</ButtonLink>
                    <Button variant="danger" onClick={() => remove(p)}>Delete</Button>
                  </div>
                </td>
              )}
            </tr>
          ))
        )}
      </Table>

      {pagination && pagination.total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
          <span>
            {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <div className="flex items-center gap-2">
            <Button disabled={page <= 1 || loading} onClick={() => updateParams({ page: page - 1 })}>Previous</Button>
            <span>Page {pagination.page} / {pagination.totalPages}</span>
            <Button disabled={page >= pagination.totalPages || loading} onClick={() => updateParams({ page: page + 1 })}>Next</Button>
          </div>
        </div>
      )}
    </>
  );
}
