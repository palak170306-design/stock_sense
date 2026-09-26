"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useConfirm, useToast } from "@/components/feedback";
import { useCanEdit } from "@/components/UserProvider";
import { Alert, Badge, Button, Input, PageHeader, Select, Spinner, Table, TableMessage, td, th } from "@/components/ui";
import { api, type Location, type LocationType, type Warehouse } from "@/lib/client/api";

const TYPE_LABELS: Record<LocationType, string> = {
  INTERNAL: "Internal",
  VENDOR: "Vendor (virtual)",
  CUSTOMER: "Customer (virtual)",
  INVENTORY_LOSS: "Inventory loss (virtual)",
};
const ALL_TYPES = Object.keys(TYPE_LABELS) as LocationType[];
const VIRTUAL_TYPES = ALL_TYPES.filter((t) => t !== "INTERNAL");

/**
 * Warehouses, their locations, and global virtual locations.
 *
 * Each warehouse card lists its locations (shelves, zones…). The last card
 * holds virtual locations that belong to no warehouse (vendors, customers,
 * inventory loss): the "other side" of receipts, deliveries and adjustments.
 */
export function WarehouseManager() {
  const canEdit = useCanEdit();
  const toast = useToast();
  const [warehouses, setWarehouses] = useState<Warehouse[] | null>(null);
  const [virtual, setVirtual] = useState<Location[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    Promise.all([
      api<{ warehouses: Warehouse[] }>("/api/warehouses"),
      api<{ locations: Location[] }>("/api/locations?warehouse=none"),
    ])
      .then(([w, l]) => {
        setWarehouses(w.warehouses);
        setVirtual(l.locations);
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  /** Run a write, toast the outcome, reload on success. */
  const mutate = useCallback(
    async (action: () => Promise<unknown>, success: string): Promise<boolean> => {
      setBusy(true);
      try {
        await action();
        toast.success(success);
        load();
        return true;
      } catch (e) {
        toast.error((e as Error).message);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [load, toast]
  );

  async function createWarehouse(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    if (await mutate(() => api("/api/warehouses", { method: "POST", body: { name: data.get("name"), code: data.get("code") } }), `Warehouse "${data.get("name")}" added`)) {
      form.reset();
    }
  }

  const ctx = { canEdit, busy, mutate };

  return (
    <>
      <PageHeader title="Warehouses & locations" description="Where stock lives. Internal locations hold stock; virtual ones are the other side of moves." />

      {canEdit && (
        <form onSubmit={createWarehouse} className="mb-6 flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 sm:flex-row dark:border-zinc-800">
          <Input name="name" placeholder="Warehouse name" required maxLength={100} />
          <Input name="code" placeholder="Code (e.g. WH2)" required maxLength={10} pattern="[A-Za-z0-9]+" className="uppercase sm:max-w-[10rem]" />
          <Button type="submit" variant="primary" disabled={busy} className="shrink-0">Add warehouse</Button>
        </form>
      )}

      {error && <div className="mb-4"><Alert onClose={() => setError(null)}>{error}</Alert></div>}

      {warehouses === null || virtual === null ? (
        <Spinner />
      ) : (
        <div className="space-y-6">
          {warehouses.length === 0 && (
            <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-zinc-500 dark:border-zinc-700">No warehouses yet.</p>
          )}
          {warehouses.map((w) => (
            <WarehouseCard key={w.id} warehouse={w} {...ctx} />
          ))}
          <LocationSection
            title="Virtual locations"
            subtitle="Not tied to a warehouse."
            locations={virtual}
            warehouseId={null}
            typeOptions={VIRTUAL_TYPES}
            {...ctx}
          />
        </div>
      )}
    </>
  );
}

type Ctx = { canEdit: boolean; busy: boolean; mutate: (a: () => Promise<unknown>, success: string) => Promise<boolean> };

function WarehouseCard({ warehouse: w, canEdit, busy, mutate }: { warehouse: Warehouse } & Ctx) {
  const [editing, setEditing] = useState(false);
  const confirm = useConfirm();

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (await mutate(() => api(`/api/warehouses/${w.id}`, { method: "PATCH", body: { name: data.get("name"), code: data.get("code") } }), "Warehouse saved")) {
      setEditing(false);
    }
  }

  async function remove() {
    const ok = await confirm({
      title: `Delete warehouse "${w.name}"?`,
      body: "Only empty warehouses can be deleted: remove its locations first.",
      confirmLabel: "Delete warehouse",
      tone: "danger",
    });
    if (ok) mutate(() => api(`/api/warehouses/${w.id}`, { method: "DELETE" }), `Deleted "${w.name}"`);
  }

  const header = editing ? (
    <form onSubmit={save} className="flex flex-1 flex-col gap-2 sm:flex-row">
      <Input name="name" defaultValue={w.name} required maxLength={100} autoFocus aria-label="Warehouse name" />
      <Input name="code" defaultValue={w.code} required maxLength={10} pattern="[A-Za-z0-9]+" className="uppercase sm:max-w-[8rem]" aria-label="Code" />
      <div className="flex shrink-0 gap-2">
        <Button type="submit" variant="primary" disabled={busy}>Save</Button>
        <Button onClick={() => setEditing(false)}>Cancel</Button>
      </div>
    </form>
  ) : (
    <>
      <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        {w.name} <Badge>{w.code}</Badge>
      </h2>
      {canEdit && (
        <div className="flex gap-2">
          <Button onClick={() => setEditing(true)} disabled={busy}>Edit</Button>
          <Button variant="danger" onClick={remove} disabled={busy}>Delete</Button>
        </div>
      )}
    </>
  );

  return (
    <LocationSection
      header={header}
      locations={w.locations}
      warehouseId={w.id}
      typeOptions={ALL_TYPES}
      canEdit={canEdit}
      busy={busy}
      mutate={mutate}
    />
  );
}

/** A card with a locations table and (for managers) an add-location form. */
function LocationSection({
  title,
  subtitle,
  header,
  locations,
  warehouseId,
  typeOptions,
  canEdit,
  busy,
  mutate,
}: {
  title?: string;
  subtitle?: string;
  header?: ReactNode;
  locations: Location[];
  warehouseId: string | null;
  typeOptions: LocationType[];
} & Ctx) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const confirm = useConfirm();

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const body = { name: data.get("name"), type: data.get("type"), warehouseId };
    if (await mutate(() => api("/api/locations", { method: "POST", body }), `Location "${body.name}" added`)) form.reset();
  }

  async function save(e: FormEvent<HTMLFormElement>, l: Location) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    // Only send the type if it changed: the API refuses type changes on
    // locations with stock history, but always allows renames.
    const type = data.get("type");
    const body = { name: data.get("name"), ...(type !== l.type && { type }) };
    if (await mutate(() => api(`/api/locations/${l.id}`, { method: "PATCH", body }), "Location saved")) setEditingId(null);
  }

  async function remove(l: Location) {
    const ok = await confirm({
      title: `Delete location "${l.name}"?`,
      body: "Locations with stock history can't be deleted; rename them instead.",
      confirmLabel: "Delete location",
      tone: "danger",
    });
    if (ok) mutate(() => api(`/api/locations/${l.id}`, { method: "DELETE" }), `Deleted "${l.name}"`);
  }

  const cols = canEdit ? 3 : 2;

  return (
    <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {header ?? (
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            {subtitle && <p className="text-sm text-zinc-500">{subtitle}</p>}
          </div>
        )}
      </div>

      <Table
        head={
          <tr>
            <th className={th}>Location</th>
            <th className={th}>Type</th>
            {canEdit && <th className={`${th} text-right`}>Actions</th>}
          </tr>
        }
      >
        {locations.length === 0 ? (
          <TableMessage colSpan={cols}>No locations.</TableMessage>
        ) : (
          locations.map((l) =>
            editingId === l.id ? (
              <tr key={l.id} className="bg-zinc-50 dark:bg-zinc-900/50">
                <td colSpan={cols} className={td}>
                  <form onSubmit={(e) => save(e, l)} className="flex flex-col gap-2 sm:flex-row">
                    <Input name="name" defaultValue={l.name} required maxLength={100} autoFocus aria-label="Location name" />
                    <Select name="type" defaultValue={l.type} aria-label="Type" className="sm:max-w-[14rem]">
                      {typeOptions.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                    </Select>
                    <div className="flex shrink-0 gap-2">
                      <Button type="submit" variant="primary" disabled={busy}>Save</Button>
                      <Button onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </form>
                </td>
              </tr>
            ) : (
              <tr key={l.id}>
                <td className={td}>{l.name}</td>
                <td className={td}>
                  <span className={l.type === "INTERNAL" ? "" : "text-zinc-500"}>{TYPE_LABELS[l.type]}</span>
                </td>
                {canEdit && (
                  <td className={`${td} whitespace-nowrap text-right`}>
                    <div className="inline-flex gap-2">
                      <Button onClick={() => setEditingId(l.id)} disabled={busy}>Edit</Button>
                      <Button variant="danger" onClick={() => remove(l)} disabled={busy}>Delete</Button>
                    </div>
                  </td>
                )}
              </tr>
            )
          )
        )}
      </Table>

      {canEdit && (
        <form onSubmit={create} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input name="name" placeholder={warehouseId ? "New location, e.g. WH/Stock/Shelf C" : "New virtual location"} required maxLength={100} />
          <Select name="type" defaultValue={typeOptions[0]} aria-label="Location type" className="sm:max-w-[14rem]">
            {typeOptions.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </Select>
          <Button type="submit" disabled={busy} className="shrink-0">Add location</Button>
        </form>
      )}
    </section>
  );
}
