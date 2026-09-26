"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useConfirm, useToast } from "@/components/feedback";
import { useCanEdit } from "@/components/UserProvider";
import { StatusBadge, formatDate } from "@/components/stock";
import { Alert, Button, ButtonLink, PageHeader, Spinner, Table, td, th } from "@/components/ui";
import { api, type TransferDetail } from "@/lib/client/api";

/**
 * One transfer: header, lines with live availability, and (for managers)
 * Validate / Cancel while it's still a draft.
 */
export function TransferDetailView({ id }: { id: string }) {
  const canEdit = useCanEdit();
  const [transfer, setTransfer] = useState<TransferDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<{ transfer: TransferDetail }>(`/api/transfers/${id}`)
      .then((r) => setTransfer(r.transfer))
      .catch((e) => setError(e.message));
  }, [id]);
  useEffect(load, [load]);

  async function act(action: "validate" | "cancel") {
    if (!transfer) return;
    const route = `${transfer.sourceLocation?.name} → ${transfer.destLocation?.name}`;
    const ok = await confirm(
      action === "validate"
        ? {
            title: `Validate ${transfer.reference}?`,
            body: `Stock moves now (${route}). Validated transfers can't be undone; reverse one with a new transfer.`,
            confirmLabel: "Validate",
          }
        : {
            title: `Cancel ${transfer.reference}?`,
            body: "It stays in the history but can no longer be validated.",
            confirmLabel: "Cancel transfer",
            tone: "danger",
          }
    );
    if (!ok) return;
    setBusy(true);
    try {
      await api(`/api/transfers/${id}/${action}`, { method: "POST" });
      toast.success(action === "validate" ? `${transfer.reference} validated. Stock has moved.` : `${transfer.reference} canceled.`);
      load();
    } catch (e) {
      // e.g. "Insufficient stock — ELEC-001 at WH/Stock: 4 on hand, 10 pcs needed"
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!transfer) return error ? <Alert>{error}</Alert> : <Spinner />;

  const open = transfer.status !== "DONE" && transfer.status !== "CANCELED";
  const anyShort = transfer.moves.some((m) => m.availableAtSource !== null && m.availableAtSource < m.quantity);

  return (
    <>
      <PageHeader
        title={transfer.reference}
        description={`${transfer.sourceLocation?.name} → ${transfer.destLocation?.name}`}
        actions={
          <>
            <ButtonLink href="/transfers">Back</ButtonLink>
            {canEdit && open && (
              <>
                <Button variant="danger" onClick={() => act("cancel")} disabled={busy}>Cancel transfer</Button>
                <Button variant="primary" onClick={() => act("validate")} disabled={busy}>
                  {busy ? "Working…" : "Validate"}
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="mb-4 space-y-2">
        {error && <Alert onClose={() => setError(null)}>{error}</Alert>}
        {open && anyShort && (
          <Alert kind="info">Some lines exceed what&apos;s currently at the source; validation will be refused until stock is available.</Alert>
        )}
      </div>

      <dl className="mb-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <Info label="Status"><StatusBadge status={transfer.status} /></Info>
        <Info label="Created">{formatDate(transfer.createdAt)}{transfer.createdBy && <><br />{transfer.createdBy.name}</>}</Info>
        <Info label="Validated">{formatDate(transfer.validatedAt)}{transfer.validatedBy && <><br />{transfer.validatedBy.name}</>}</Info>
        <Info label="Note">{transfer.note || "—"}</Info>
      </dl>

      <Table
        head={
          <tr>
            <th className={th}>Product</th>
            <th className={`${th} text-right`}>Quantity</th>
            {open && <th className={`${th} text-right`}>Available at source</th>}
            <th className={th}>Line status</th>
          </tr>
        }
      >
        {transfer.moves.map((m) => {
          const short = m.availableAtSource !== null && m.availableAtSource < m.quantity;
          return (
            <tr key={m.id}>
              <td className={td}>
                <Link href={`/products/${m.product.id}`} className="hover:underline">
                  <span className="font-mono text-xs">{m.product.sku}</span> {m.product.name}
                </Link>
              </td>
              <td className={`${td} text-right tabular-nums`}>{m.quantity} {m.product.unitOfMeasure}</td>
              {open && (
                <td className={`${td} text-right tabular-nums ${short ? "font-medium text-red-600 dark:text-red-400" : ""}`}>
                  {m.availableAtSource} {short && "· short"}
                </td>
              )}
              <td className={td}><StatusBadge status={m.status} /></td>
            </tr>
          );
        })}
      </Table>
      <p className="mt-3 text-xs text-zinc-500">
        Each line is one ledger move; see them in <Link href={`/moves?document=${transfer.id}`} className="underline">Move history</Link>.
      </p>
    </>
  );
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}
