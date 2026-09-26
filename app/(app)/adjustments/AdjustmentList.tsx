"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCanEdit } from "@/components/UserProvider";
import { PaginationBar, formatDate } from "@/components/stock";
import { Alert, ButtonLink, PageHeader, Spinner, Table, TableMessage, td, th } from "@/components/ui";
import { api, type Adjustment, type Pagination } from "@/lib/client/api";

/** Stock adjustments (count corrections), newest first. */
export function AdjustmentList() {
  const canEdit = useCanEdit();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ adjustments: Adjustment[]; pagination: Pagination } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    api<{ adjustments: Adjustment[]; pagination: Pagination }>(`/api/adjustments?page=${page}`, { signal: ctrl.signal })
      .then(setData)
      .catch((e) => e.name !== "AbortError" && setError(e.message));
    return () => ctrl.abort();
  }, [page]);

  return (
    <>
      <PageHeader
        title="Stock adjustments"
        description="Corrections from physical counts. Each books the difference to or from Inventory Loss."
        actions={canEdit && <ButtonLink href="/adjustments/new" variant="primary">+ New adjustment</ButtonLink>}
      />

      {error && <div className="mb-4"><Alert onClose={() => setError(null)}>{error}</Alert></div>}

      <Table
        head={
          <tr>
            <th className={th}>Reference</th>
            <th className={th}>Product</th>
            <th className={th}>Location</th>
            <th className={`${th} text-right`}>Recorded</th>
            <th className={`${th} text-right`}>Counted</th>
            <th className={`${th} text-right`}>Change</th>
            <th className={th}>Reason</th>
            <th className={th}>Date</th>
          </tr>
        }
      >
        {!data ? (
          <TableMessage colSpan={8}><Spinner /></TableMessage>
        ) : data.adjustments.length === 0 ? (
          <TableMessage colSpan={8}>
            No adjustments yet.{canEdit && <> <Link href="/adjustments/new" className="font-medium underline">Record a stock count</Link> to correct recorded quantities.</>}
          </TableMessage>
        ) : (
          data.adjustments.map((a) => (
            <tr key={a.id}>
              <td className={`${td} font-mono text-xs`}>
                <Link href={`/moves?document=${a.id}`} className="hover:underline">{a.reference}</Link>
              </td>
              <td className={td}>
                <Link href={`/products/${a.product.id}`} className="hover:underline">
                  <span className="font-mono text-xs">{a.product.sku}</span> {a.product.name}
                </Link>
              </td>
              <td className={td}>{a.location.name}</td>
              <td className={`${td} text-right tabular-nums`}>{a.recordedQuantity}</td>
              <td className={`${td} text-right tabular-nums`}>{a.countedQuantity}</td>
              <td className={`${td} text-right font-medium tabular-nums ${a.delta > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {a.delta > 0 ? `+${a.delta}` : a.delta} {a.product.unitOfMeasure}
              </td>
              <td className={`${td} max-w-xs truncate text-zinc-600 dark:text-zinc-400`} title={a.note}>{a.note}</td>
              <td className={`${td} whitespace-nowrap text-zinc-600 dark:text-zinc-400`}>
                {formatDate(a.createdAt)}{a.createdBy && ` · ${a.createdBy.name}`}
              </td>
            </tr>
          ))
        )}
      </Table>
      {data && <PaginationBar pagination={data.pagination} onPage={setPage} />}
    </>
  );
}
