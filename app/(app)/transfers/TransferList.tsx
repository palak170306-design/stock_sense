"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCanEdit } from "@/components/UserProvider";
import { PaginationBar, StatusBadge, formatDate } from "@/components/stock";
import { Alert, ButtonLink, PageHeader, Spinner, Table, TableMessage, td, th } from "@/components/ui";
import { api, type MoveStatus, type Pagination, type TransferSummary } from "@/lib/client/api";

const FILTERS: { label: string; status?: MoveStatus }[] = [
  { label: "All" },
  { label: "Draft", status: "DRAFT" },
  { label: "Done", status: "DONE" },
  { label: "Canceled", status: "CANCELED" },
];

/** Internal transfers, newest first, filterable by status. */
export function TransferList() {
  const canEdit = useCanEdit();
  const [status, setStatus] = useState<MoveStatus | undefined>();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ transfers: TransferSummary[]; pagination: Pagination } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    const qs = new URLSearchParams({ page: String(page), ...(status && { status }) });
    api<{ transfers: TransferSummary[]; pagination: Pagination }>(`/api/transfers?${qs}`, { signal: ctrl.signal })
      .then(setData)
      .catch((e) => e.name !== "AbortError" && setError(e.message));
    return () => ctrl.abort();
  }, [status, page]);

  return (
    <>
      <PageHeader
        title="Internal transfers"
        description="Move stock between your own locations. Total on hand stays the same; only where it sits changes."
        actions={canEdit && <ButtonLink href="/transfers/new" variant="primary">+ New transfer</ButtonLink>}
      />

      <div className="mb-4 flex flex-wrap gap-1" role="tablist">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            role="tab"
            aria-selected={status === f.status}
            onClick={() => { setStatus(f.status); setPage(1); }}
            className={`rounded-md px-3 py-1 text-sm ${status === f.status ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <div className="mb-4"><Alert onClose={() => setError(null)}>{error}</Alert></div>}

      <Table
        head={
          <tr>
            <th className={th}>Reference</th>
            <th className={th}>From → To</th>
            <th className={`${th} text-right`}>Lines</th>
            <th className={`${th} text-right`}>Total qty</th>
            <th className={th}>Status</th>
            <th className={th}>Created</th>
          </tr>
        }
      >
        {!data ? (
          <TableMessage colSpan={6}><Spinner /></TableMessage>
        ) : data.transfers.length === 0 ? (
          <TableMessage colSpan={6}>
            No transfers{status ? ` with status ${status.toLowerCase()}` : " yet"}.
            {!status && canEdit && <> <Link href="/transfers/new" className="font-medium underline">Create one</Link> to move stock between locations.</>}
          </TableMessage>
        ) : (
          data.transfers.map((t) => (
            <tr key={t.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
              <td className={`${td} font-mono text-xs`}>
                <Link href={`/transfers/${t.id}`} className="font-medium hover:underline">{t.reference}</Link>
              </td>
              <td className={td}>{t.sourceLocation?.name} → {t.destLocation?.name}</td>
              <td className={`${td} text-right tabular-nums`}>{t.lineCount}</td>
              <td className={`${td} text-right tabular-nums`}>{t.totalQuantity}</td>
              <td className={td}><StatusBadge status={t.status} /></td>
              <td className={`${td} whitespace-nowrap text-zinc-600 dark:text-zinc-400`}>
                {formatDate(t.createdAt)}{t.createdBy && ` · ${t.createdBy.name}`}
              </td>
            </tr>
          ))
        )}
      </Table>
      {data && <PaginationBar pagination={data.pagination} onPage={setPage} />}
    </>
  );
}
