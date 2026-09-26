"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCanEdit } from "@/components/UserProvider";
import { Alert, Badge, ButtonLink, PageHeader, Spinner, Table, TableMessage, td, th } from "@/components/ui";
import { api, type Product } from "@/lib/client/api";

type StockResponse = {
  totalOnHand: number;
  isLowStock: boolean;
  locations: {
    locationId: string;
    locationName: string;
    warehouse: { name: string; code: string } | null;
    onHand: number;
  }[];
};

/**
 * Product details plus stock availability per internal location, from
 * GET /api/products/:id/stock. The quantities are computed from stock moves
 * on every request; a brand-new product shows 0 everywhere.
 */
export function ProductDetail({ id }: { id: string }) {
  const canEdit = useCanEdit();
  const [product, setProduct] = useState<Product | null>(null);
  const [stock, setStock] = useState<StockResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<{ product: Product }>(`/api/products/${id}`),
      api<StockResponse>(`/api/products/${id}/stock`),
    ])
      .then(([p, s]) => {
        setProduct(p.product);
        setStock(s);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <Alert>{error}</Alert>;
  if (!product || !stock) return <Spinner />;

  const unit = product.unitOfMeasure;

  return (
    <>
      <PageHeader
        title={product.name}
        description={`${product.sku} · ${product.category.name}`}
        actions={
          <>
            <ButtonLink href="/products">Back</ButtonLink>
            <ButtonLink href={`/moves?product=${id}`}>Move history</ButtonLink>
            {canEdit && <ButtonLink href={`/products/${id}/edit`} variant="primary">Edit</ButtonLink>}
          </>
        }
      />

      <dl className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ["On hand (all locations)", `${stock.totalOnHand} ${unit}`],
          ["Reorder level", `${product.reorderLevel} ${unit}`],
          ["Unit of measure", unit],
          ["Status", stock.isLowStock ? "Low stock" : "OK"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <dt className="text-xs text-zinc-500">{label}</dt>
            <dd className={`mt-1 font-semibold tabular-nums ${label === "Status" && stock.isLowStock ? "text-amber-600 dark:text-amber-400" : ""}`}>
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <h2 className="mb-3 text-lg font-semibold tracking-tight">Stock by location</h2>
      <Table
        head={
          <tr>
            <th className={th}>Warehouse</th>
            <th className={th}>Location</th>
            <th className={`${th} text-right`}>On hand</th>
          </tr>
        }
      >
        {stock.locations.length === 0 ? (
          <TableMessage colSpan={3}>No internal locations yet. Add one under Warehouses.</TableMessage>
        ) : (
          stock.locations.map((l) => (
            <tr key={l.locationId}>
              <td className={td}>
                {l.warehouse ? <>{l.warehouse.name} <Badge>{l.warehouse.code}</Badge></> : "—"}
              </td>
              <td className={td}>
                <Link href={`/moves?product=${id}&location=${l.locationId}`} className="hover:underline">{l.locationName}</Link>
              </td>
              <td className={`${td} text-right tabular-nums ${l.onHand === 0 ? "text-zinc-400" : ""}`}>
                {l.onHand} {unit}
              </td>
            </tr>
          ))
        )}
      </Table>
      <p className="mt-2 text-xs text-zinc-500">
        Derived live from completed stock moves (in − out); no quantity is stored on the product. Click a location to see its moves.
      </p>
    </>
  );
}
