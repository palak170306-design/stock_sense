"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useConfirm, useToast } from "@/components/feedback";
import { useCanEdit } from "@/components/UserProvider";
import { Alert, Button, Input, PageHeader, Spinner, Table, TableMessage, td, th } from "@/components/ui";
import { api, type Category } from "@/lib/client/api";

/**
 * List / create / rename / delete categories on one page.
 * Deleting a category that still has products is refused by the API; its
 * message ("3 products are still in this category…") is shown as-is.
 */
export function CategoryManager() {
  const canEdit = useCanEdit();
  const toast = useToast();
  const confirm = useConfirm();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<{ categories: Category[] }>("/api/categories")
      .then((r) => setCategories(r.categories))
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  /** Run a write, toast the outcome, and reload the list on success. */
  async function mutate(action: () => Promise<unknown>, success: string): Promise<boolean> {
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
  }

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const ok = await mutate(() =>
      api("/api/categories", { method: "POST", body: { name: data.get("name"), description: data.get("description") } }),
      `Category "${data.get("name")}" added`
    );
    if (ok) form.reset();
  }

  async function save(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const ok = await mutate(() =>
      api(`/api/categories/${id}`, { method: "PATCH", body: { name: data.get("name"), description: data.get("description") } }),
      "Category saved"
    );
    if (ok) setEditingId(null);
  }

  async function remove(c: Category) {
    const ok = await confirm({
      title: `Delete category "${c.name}"?`,
      body: "Categories that still contain products can't be deleted.",
      confirmLabel: "Delete category",
      tone: "danger",
    });
    if (ok) mutate(() => api(`/api/categories/${c.id}`, { method: "DELETE" }), `Deleted "${c.name}"`);
  }

  const cols = canEdit ? 4 : 3;

  return (
    <>
      <PageHeader title="Categories" description="Group products for filtering and reporting." />

      {canEdit && (
        <form onSubmit={create} className="mb-6 flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 sm:flex-row dark:border-zinc-800">
          <Input name="name" placeholder="New category name" required maxLength={100} className="sm:max-w-xs" />
          <Input name="description" placeholder="Description (optional)" maxLength={500} />
          <Button type="submit" variant="primary" disabled={busy} className="shrink-0">Add category</Button>
        </form>
      )}

      {error && <div className="mb-4"><Alert onClose={() => setError(null)}>{error}</Alert></div>}

      <Table
        head={
          <tr>
            <th className={th}>Name</th>
            <th className={th}>Description</th>
            <th className={`${th} text-right`}>Products</th>
            {canEdit && <th className={`${th} text-right`}>Actions</th>}
          </tr>
        }
      >
        {categories === null ? (
          <TableMessage colSpan={cols}><Spinner /></TableMessage>
        ) : categories.length === 0 ? (
          <TableMessage colSpan={cols}>No categories yet.{canEdit && " Add one above; every product needs a category."}</TableMessage>
        ) : (
          categories.map((c) =>
            editingId === c.id ? (
              <tr key={c.id} className="bg-zinc-50 dark:bg-zinc-900/50">
                <td colSpan={cols} className={td}>
                  <form onSubmit={(e) => save(e, c.id)} className="flex flex-col gap-2 sm:flex-row">
                    <Input name="name" defaultValue={c.name} required maxLength={100} autoFocus className="sm:max-w-xs" aria-label="Name" />
                    <Input name="description" defaultValue={c.description} maxLength={500} aria-label="Description" />
                    <div className="flex shrink-0 gap-2">
                      <Button type="submit" variant="primary" disabled={busy}>Save</Button>
                      <Button onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </form>
                </td>
              </tr>
            ) : (
              <tr key={c.id}>
                <td className={`${td} font-medium`}>{c.name}</td>
                <td className={`${td} text-zinc-600 dark:text-zinc-400`}>{c.description || "—"}</td>
                <td className={`${td} text-right tabular-nums`}>
                  <Link href={`/products?category=${c.id}`} className="hover:underline">{c._count?.products ?? 0}</Link>
                </td>
                {canEdit && (
                  <td className={`${td} whitespace-nowrap text-right`}>
                    <div className="inline-flex gap-2">
                      <Button onClick={() => setEditingId(c.id)} disabled={busy}>Edit</Button>
                      <Button variant="danger" onClick={() => remove(c)} disabled={busy}>Delete</Button>
                    </div>
                  </td>
                )}
              </tr>
            )
          )
        )}
      </Table>
    </>
  );
}
