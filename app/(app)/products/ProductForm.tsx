"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useToast } from "@/components/feedback";
import { Alert, Button, ButtonLink, Field, Input, Select, Spinner } from "@/components/ui";
import { api, type Category, type Product } from "@/lib/client/api";

// Suggestions for the unit field; any value is accepted.
const COMMON_UNITS = ["pcs", "box", "kg", "g", "l", "ml", "m", "ream", "pack", "pair"];

/**
 * Create/edit form for a product. With `productId` it loads the product and
 * PATCHes it; without, it POSTs a new one. Server validation errors (e.g.
 * duplicate SKU) are shown above the form.
 */
export function ProductForm({ productId }: { productId?: string }) {
  const router = useRouter();
  const editing = Boolean(productId);
  const toast = useToast();

  const [categories, setCategories] = useState<Category[] | null>(null);
  const [initial, setInitial] = useState<Product | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api<{ categories: Category[] }>("/api/categories"),
      productId ? api<{ product: Product }>(`/api/products/${productId}`) : null,
    ])
      .then(([c, p]) => {
        setCategories(c.categories);
        if (p) setInitial(p.product);
      })
      .catch((e) => setLoadError(e.message));
  }, [productId]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body = {
      name: form.get("name"),
      sku: form.get("sku"),
      categoryId: form.get("categoryId"),
      unitOfMeasure: form.get("unitOfMeasure"),
      reorderLevel: form.get("reorderLevel"),
    };
    setSaving(true);
    setError(null);
    try {
      await api(editing ? `/api/products/${productId}` : "/api/products", {
        method: editing ? "PATCH" : "POST",
        body,
      });
      toast.success(editing ? "Product saved" : `Product ${String(body.sku).toUpperCase()} created`);
      router.push("/products");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  if (loadError) return <Alert>{loadError}</Alert>;
  if (!categories || (editing && !initial)) return <Spinner />;

  if (categories.length === 0) {
    return (
      <Alert kind="info">
        Create a category first — every product needs one.{" "}
        <Link href="/categories" className="font-medium underline">Go to categories</Link>
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4">
      {error && <Alert onClose={() => setError(null)}>{error}</Alert>}

      <Field label="Name">
        <Input name="name" defaultValue={initial?.name} required maxLength={200} autoFocus />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="SKU" hint="Unique. Letters, digits, . _ - (stored upper-case)">
          <Input name="sku" defaultValue={initial?.sku} required maxLength={64} pattern="[A-Za-z0-9._\-]+" className="font-mono uppercase" />
        </Field>
        <Field label="Category">
          <Select name="categoryId" defaultValue={initial?.categoryId ?? ""} required>
            <option value="" disabled>Select a category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Unit of measure" hint="e.g. pcs, box, kg">
          <Input name="unitOfMeasure" defaultValue={initial?.unitOfMeasure ?? "pcs"} list="uom-options" required maxLength={20} />
          <datalist id="uom-options">
            {COMMON_UNITS.map((u) => <option key={u} value={u} />)}
          </datalist>
        </Field>
        <Field label="Reorder level" hint="Low-stock alert at or below this quantity">
          <Input name="reorderLevel" type="number" min={0} step={1} defaultValue={initial?.reorderLevel ?? 0} required />
        </Field>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Saving…" : editing ? "Save changes" : "Create product"}
        </Button>
        <ButtonLink href="/products">Cancel</ButtonLink>
      </div>
    </form>
  );
}
