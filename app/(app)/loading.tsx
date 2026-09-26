import { Spinner } from "@/components/ui";

/** Shown inside the app shell while a page's server work is in flight. */
export default function Loading() {
  return (
    <div className="flex min-h-40 items-center justify-center">
      <Spinner />
    </div>
  );
}
