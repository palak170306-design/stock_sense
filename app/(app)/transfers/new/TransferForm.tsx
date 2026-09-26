"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useToast } from "@/components/feedback";
import { locationLabel, useStockOptions } from "@/components/stock";
import { Alert, Button, ButtonLink, Field, Input, Select, Spinner, Table, TableMessage, td, th } from "@/components/ui";
import { api, type TransferDetail } from "@/lib/client/api";

type Line = { key: number; productId: string; quantity: string };
type StockResponse = { locations: { locationId: string; onHand: number }[] };

let nextKey = 1;
const newLine = (): Line => ({ key: nextKey++, productId: "", quantity: "1" });

/**
 * Transfer form: source + destination (INTERNAL only) and product lines.
 * Each line shows what's currently on hand at the source, as a hint; the
 * binding check happens server-side at validation time.
 */
export function TransferForm() {
  const router = useRouter();
  const toast = useToast();
  const { products, locations, error: loadError } = useStockOptions("INTERNAL");
  const [sourceId, setSourceId] = useState("");
  const [destId, setDestId] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>(() => [newLine()]);
  // productId -> (locationId -> on hand); fetched once per product.
  const [stock, setStock] = useState<Record<string, Record<string, number>>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch per-location stock for any product we haven't loaded yet.
  const productIds = lines.map((l) => l.productId).filter(Boolean).join(",");
  useEffect(() => {
    for (const id of productIds.split(",").filter((id) => id && !(id in stock))) {
      api<StockResponse>(`/api/products/${id}/stock`)
        .then((r) => setStock((s) => ({ ...s, [id]: Object.fromEntries(r.locations.map((l) => [l.locationId, l.onHand])) })))
        .catch(() => {}); // availability is only a hint
    }
  }, [productIds, stock]);

  const update = (key: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (sourceId === destId) return setError("Source and destination must be different locations.");
    const chosen = lines.filter((l) => l.productId);
    if (chosen.length === 0) return setError("Add at least one product.");
    if (new Set(chosen.map((l) => l.productId)).size !== chosen.length) {
      return setError("Each product can appear only once. Combine the quantities into one line.");
    }

    setSaving(true);
    try {
      const { transfer } = await api<{ transfer: TransferDetail }>("/api/transfers", {
        method: "POST",
        body: {
          sourceLocationId: sourceId,
          destLocationId: destId,
          note,
          lines: chosen.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        },
      });
      toast.success(`Draft ${transfer.reference} created. Validate it to move the stock.`);
      router.push(`/transfers/${transfer.id}`);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  if (loadError) return <Alert>{loadError}</Alert>;
  if (!products || !locations) return <Spinner />;
  if (locations.length < 2) return <Alert kind="info">You need at least two internal locations to make a transfer.</Alert>;

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-5">
      {error && <Alert onClose={() => setError(null)}>{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="From (source)">
          <Select value={sourceId} onChange={(e) => setSourceId(e.target.value)} required>
            <option value="" disabled>Select location…</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{locationLabel(l)}</option>)}
          </Select>
        </Field>
        <Field label="To (destination)">
          <Select value={destId} onChange={(e) => setDestId(e.target.value)} required>
            <option value="" disabled>Select location…</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id} disabled={l.id === sourceId}>{locationLabel(l)}</option>
            ))}
          </Select>
        </Field>
      </div>

      <Table
        head={
          <tr>
            <th className={th}>Product</th>
            <th className={`${th} text-right`}>At source</th>
            <th className={`${th} w-32`}>Quantity</th>
            <th className={th}><span className="sr-only">Remove</span></th>
          </tr>
        }
      >
        {lines.length === 0 && <TableMessage colSpan={4}>No lines.</TableMessage>}
        {lines.map((line) => {
          const product = products.find((p) => p.id === line.productId);
          const available = line.productId && sourceId ? stock[line.productId]?.[sourceId] : undefined;
          const short = available !== undefined && Number(line.quantity) > available;
          return (
            <tr key={line.key}>
              <td className={td}>
                <Select value={line.productId} onChange={(e) => update(line.key, { productId: e.target.value })} aria-label="Product" required>
                  <option value="" disabled>Select product…</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
                </Select>
              </td>
              <td className={`${td} whitespace-nowrap text-right tabular-nums ${short ? "font-medium text-red-600 dark:text-red-400" : "text-zinc-500"}`}>
                {available === undefined ? "—" : `${available} ${product?.unitOfMeasure ?? ""}`}
              </td>
              <td className={td}>
                <Input type="number" min={1} step={1} value={line.quantity} onChange={(e) => update(line.key, { quantity: e.target.value })} aria-label="Quantity" required />
              </td>
              <td className={`${td} text-right`}>
                <Button variant="ghost" onClick={() => setLines((ls) => ls.filter((l) => l.key !== line.key))} disabled={lines.length === 1} aria-label="Remove line">✕</Button>
              </td>
            </tr>
          );
        })}
      </Table>
      <Button onClick={() => setLines((ls) => [...ls, newLine()])}>+ Add line</Button>

      <Field label="Note (optional)">
        <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="e.g. Restock front shelf" />
      </Field>

      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={saving}>{saving ? "Saving…" : "Create draft transfer"}</Button>
        <ButtonLink href="/transfers">Cancel</ButtonLink>
      </div>
    </form>
  );
}
