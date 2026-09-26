"use client";

/**
 * App-wide feedback: toasts and confirm dialogs.
 *
 *   const toast = useToast();      toast.success("Saved"); toast.error(err.message)
 *   const confirm = useConfirm();  if (await confirm({ title, body, confirmLabel, tone: "danger" })) …
 *
 * Toasts report the outcome of an ACTION (save, delete, validate). Errors
 * about LOADING a page stay inline, where they explain the empty screen.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

// ─── Toasts ─────────────────────────────────────────────────────────────────

type Toast = { id: number; kind: "success" | "error" | "info"; message: string };
type ToastApi = { success: (m: string) => void; error: (m: string) => void; info: (m: string) => void };

const ToastContext = createContext<ToastApi | null>(null);

const TOAST_STYLES = {
  success: { icon: "✓", className: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100" },
  error: { icon: "✕", className: "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100" },
  info: { icon: "i", className: "border-zinc-300 bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" },
};

// ─── Confirm dialog ─────────────────────────────────────────────────────────

type ConfirmOptions = { title: string; body?: ReactNode; confirmLabel?: string; tone?: "danger" | "default" };
type ConfirmFn = (o: ConfirmOptions) => Promise<boolean>;
const ConfirmContext = createContext<ConfirmFn | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (kind: Toast["kind"], message: string) => {
      const id = nextId.current++;
      setToasts((ts) => [...ts.slice(-3), { id, kind, message }]); // keep at most 4
      // Errors linger longer: they usually need reading.
      setTimeout(() => dismiss(id), kind === "error" ? 7000 : 3500);
    },
    [dismiss]
  );
  const [toastApi] = useState<ToastApi>(() => ({
    success: (m) => push("success", m),
    error: (m) => push("error", m),
    info: (m) => push("info", m),
  }));

  // One dialog at a time; the pending promise's resolver lives in state.
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);
  const confirm = useCallback<ConfirmFn>((o) => new Promise((resolve) => setDialog({ ...o, resolve })), []);
  const close = (ok: boolean) => {
    dialog?.resolve(ok);
    setDialog(null);
  };

  return (
    <ToastContext.Provider value={toastApi}>
      <ConfirmContext.Provider value={confirm}>
        {children}

        {/* Toast stack (announced to screen readers) */}
        <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:left-auto">
          {toasts.map((t) => (
            <div
              key={t.id}
              role={t.kind === "error" ? "alert" : "status"}
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-lg border px-3 py-2 text-sm shadow-lg ${TOAST_STYLES[t.kind].className}`}
            >
              <span aria-hidden className="font-bold">{TOAST_STYLES[t.kind].icon}</span>
              <span className="flex-1">{t.message}</span>
              <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="opacity-60 hover:opacity-100">✕</button>
            </div>
          ))}
        </div>

        {dialog && <ConfirmDialog {...dialog} onClose={close} />}
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}

function ConfirmDialog({ title, body, confirmLabel = "Confirm", tone = "default", onClose }: ConfirmOptions & { onClose: (ok: boolean) => void }) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Focus the confirm button on open; Escape cancels.
  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => onClose(false)} aria-hidden />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="relative w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
      >
        <h2 id="confirm-title" className="text-lg font-semibold tracking-tight">{title}</h2>
        {body && <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{body}</div>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={() => onClose(false)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            onClick={() => onClose(true)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium text-white ${
              tone === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-zinc-900 hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <FeedbackProvider>");
  return ctx;
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside <FeedbackProvider>");
  return ctx;
}
