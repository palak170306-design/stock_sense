/**
 * Browser-side fetch wrapper for our JSON API.
 *
 * - Sends/receives JSON; the session cookie rides along automatically.
 * - Non-2xx responses throw ApiError carrying the server's `{ error }`
 *   message, so pages can simply `catch (e) { setError(e.message) }`.
 * - A 401 means the session expired mid-use: bounce to /login.
 */

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

type Options = { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown; signal?: AbortSignal };

export async function api<T>(url: string, { method = "GET", body, signal }: Options = {}): Promise<T> {
  const res = await fetch(url, {
    method,
    signal,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    // Deliberately a full page load (not router.push): drop all client state
    // belonging to the expired session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/login?next=${encodeURIComponent(location.pathname + location.search)}`;
  }
  if (!res.ok) throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status);
  return data as T;
}

/** Shapes returned by the API (dates arrive as ISO strings over JSON). */
export type CategoryRef = { id: string; name: string };
export type Category = CategoryRef & { description: string; _count?: { products: number } };
export type Product = {
  id: string;
  name: string;
  sku: string;
  unitOfMeasure: string;
  reorderLevel: number;
  categoryId: string;
  category: CategoryRef;
  // Derived stock, included by GET /api/products.
  onHand?: number;
  stockStatus?: StockStatus;
};
export type Pagination = { page: number; limit: number; total: number; totalPages: number };
export type LocationType = "INTERNAL" | "VENDOR" | "CUSTOMER" | "INVENTORY_LOSS";
export type Location = { id: string; name: string; type: LocationType; warehouseId: string | null };
export type Warehouse = { id: string; name: string; code: string; locations: Location[] };

// ─── Stock documents & ledger ───────────────────────────────────────────────

export type DocumentType = "RECEIPT" | "DELIVERY" | "INTERNAL" | "ADJUSTMENT";
export type MoveStatus = "DRAFT" | "WAITING" | "READY" | "DONE" | "CANCELED";
export type LocationRef = { id: string; name: string; type: LocationType };
export type ProductRef = { id: string; name: string; sku: string; unitOfMeasure: string };
export type UserRef = { id?: string; name: string } | null;

export type Move = {
  id: string;
  quantity: number;
  documentType: DocumentType;
  status: MoveStatus;
  reference: string;
  createdAt: string;
  doneAt: string | null;
  productId: string;
  sourceLocationId: string;
  destLocationId: string;
  product: ProductRef;
  sourceLocation: LocationRef;
  destLocation: LocationRef;
};

export type StockDocument = {
  id: string;
  reference: string;
  type: DocumentType;
  status: MoveStatus;
  note: string;
  createdAt: string;
  validatedAt: string | null;
  sourceLocation: LocationRef | null;
  destLocation: LocationRef | null;
  createdBy: UserRef;
  validatedBy?: UserRef;
};

/** GET /api/transfers/:id — lines carry live availability while open. */
export type TransferDetail = StockDocument & { moves: (Move & { availableAtSource: number | null })[] };
export type TransferSummary = StockDocument & { lineCount: number; totalQuantity: number };

export type Adjustment = StockDocument & {
  recordedQuantity: number;
  countedQuantity: number;
  delta: number;
  product: ProductRef;
  location: LocationRef;
};

/** GET /api/moves row. `date` = doneAt ?? createdAt. */
export type LedgerMove = Move & {
  date: string;
  document: { id: string; reference: string; type: DocumentType; note: string } | null;
};

/** Location with its warehouse, as returned by GET /api/locations. */
export type LocationOption = Location & { warehouse: { id: string; name: string; code: string } | null };

// ─── Dashboard & alerts ─────────────────────────────────────────────────────

export type StockStatus = "OUT" | "LOW" | "OK";

export type ReorderAlert = ProductRef & {
  category: CategoryRef;
  onHand: number;
  reorderLevel: number;
  shortfall: number;
  status: "OUT" | "LOW";
};

export type DashboardData = {
  kpis: {
    totalProducts: number;
    productsInStock: number;
    lowStock: number;
    outOfStock: number;
    pendingReceipts: number;
    pendingDeliveries: number;
    scheduledTransfers: number;
  };
  lowStock: ReorderAlert[];
  outOfStock: ReorderAlert[];
  movesLast7Days: { date: string; count: number; byType: Partial<Record<DocumentType, number>> }[];
};

/** Row of GET /api/documents (dashboard activity list). */
export type DocumentRow = StockDocument & { lineCount: number; totalQuantity: number; productsSummary: string };
