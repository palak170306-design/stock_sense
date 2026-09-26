"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useConfirm, useToast } from "@/components/feedback";
import { locationLabel, useStockOptions } from "@/components/stock";
import { Alert, Button, ButtonLink, Field, Input, Select, Spinner } from "@/components/ui";
import { api } from "@/lib/client/api";

type StockResponse = { locations: { locationId: string; onHand: number }[] };

/**
 * Adjustment form. Once a product and location are picked it shows the
 * RECORDED quantity next to the COUNTED input, and previews the correction
 * (delta and direction) before saving. The server recomputes recorded stock
 * inside its transaction, so the preview can't cause a wrong booking even if
 * stock changed in the meantime.
 */
export function AdjustmentForm() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { products, locations, error: loadError } = useStockOptions("INTERNAL");
  const [productId, setProductId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [counted, setCounted] = useState("");
  const [reason, setReason] = useState("");
  // Recorded on-hand per location for the selected product, tagged with the
  // product it belongs to so a stale response is never shown for another one.
  const [recordedFor, setRecordedFor] = useState<{ productId: string; byLocation: Record<string, number> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!productId) return;
    let stale = false;
    api<StockResponse>(`/api/products/${productId}/stock`)
      .then((r) => {
        if (!stale) setRecordedFor({ productId, byLocation: Object.fromEntries(r.locations.map((l) => [l.locationId, l.onHand])) });
      })
      .catch((e) => !stale && setError(e.message));
    return () => { stale = true; };
  }, [productId]);

  const product = products?.find((p) => p.id === productId);
  const location = locations?.find((l) => l.id === locationId);
  const recorded =
    recordedFor && recordedFor.productId === productId && locationId ? recordedFor.byLocation[locationId] : undefined;
  const countedNum = counted === "" ? undefined : Number(counted);
  const delta = recorded !== undefined && countedNum !== undefined && Number.isInteger(countedNum) ? countedNum - recorded : undefined;
  const unit = product?.unitOfMeasure ?? "";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    // Adjustments are booked immediately (no draft), so confirm the delta.
    const ok = await confirm({
      title: "Apply this adjustment?",
      body:
        delta === undefined
          ? "The difference between the counted and recorded quantity will be booked now."
          : `${product?.sku} at ${location?.name}: ${recorded} → ${countedNum} (${delta > 0 ? "+" : ""}${delta} ${unit}). This is booked immediately and can't be undone; correct it with another adjustment.`,
      confirmLabel: "Apply adjustment",
    });
    if (!ok) return;
    setSaving(true);
    setError(null);
    try {
      await api("/api/adjustments", {
        method: "POST",
        body: { productId, locationId, countedQuantity: counted, reason },
      });
      toast.success(`Adjustment booked for ${product?.sku}`);
      router.push("/adjustments");
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  if (loadError) return <Alert>{loadError}</Alert>;
  if (!products || !locations) return <Spinner />;

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-5">
      {error && <Alert onClose={() => setError(null)}>{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Product">
          <Select value={productId} onChange={(e) => setProductId(e.target.value)} required>
            <option value="" disabled>Select product…</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
          </Select>
        </Field>
        <Field label="Location">
          <Select value={locationId} onChange={(e) => setLocationId(e.target.value)} required>
            <option value="" disabled>Select location…</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{locationLabel(l)}</option>)}
          </Select>
        </Field>
      </div>

      {/* Recorded vs counted, side by side */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-sm font-medium">Recorded (system)</span>
          <div className="mt-1 rounded-md border border-dashed border-zinc-300 px-3 py-1.5 text-sm tabular-nums dark:border-zinc-700">
            {!productId || !locationId ? <span className="text-zinc-400">Pick product &amp; location</span>
              : recorded === undefined ? <Spinner label="" />
              : `${recorded} ${unit}`}
          </div>
        </div>
        <Field label="Counted (physical)">
          <Input type="number" min={0} step={1} value={counted} onChange={(e) => setCounted(e.target.value)} required placeholder="0" />
        </Field>
      </div>

      {delta !== undefined && (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            delta === 0
              ? "border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400"
              : delta > 0
                ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                : "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          }`}
        >
          {delta === 0 ? (
            "Count matches the record. Nothing to adjust."
          ) : (
            <>
              <span className="font-semibold tabular-nums">{delta > 0 ? `+${delta}` : delta} {unit}</span>{" "}
              {delta > 0
                ? `found. Books ${delta} from Inventory Loss → ${location?.name}.`
                : `missing. Books ${-delta} from ${location?.name} → Inventory Loss.`}
            </>
          )}
        </div>
      )}

      <Field label="Reason" hint="Required, e.g. cycle count, damaged in handling, found misplaced stock">
        <Input value={reason} onChange={(e) => setReason(e.target.value)} required maxLength={500} />
      </Field>

      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={saving || delta === 0}>
          {saving ? "Saving…" : "Apply adjustment"}
        </Button>
        <ButtonLink href="/adjustments">Cancel</ButtonLink>
      </div>
    </form>
  );
}
