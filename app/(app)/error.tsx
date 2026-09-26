"use client";

import { Button } from "@/components/ui";

/**
 * Error boundary for signed-in pages: an unexpected exception shows this
 * inside the app shell (navigation keeps working) instead of a blank page.
 * Details stay in the server logs; `digest` lets you correlate them.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md rounded-lg border border-red-300 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950">
      <h1 className="text-lg font-semibold text-red-900 dark:text-red-100">Something went wrong</h1>
      <p className="mt-2 text-sm text-red-800 dark:text-red-200">
        This page hit an unexpected error. Try again; if it keeps happening, the database may be unavailable.
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-red-700 dark:text-red-300">Ref: {error.digest}</p>}
      <Button variant="primary" className="mt-4" onClick={reset}>Try again</Button>
    </div>
  );
}
