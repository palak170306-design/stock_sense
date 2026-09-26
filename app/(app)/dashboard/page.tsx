import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import { DashboardView } from "./DashboardView";

export const metadata = { title: "Dashboard · StockSense" };

/** Landing page after login. Read-only for every role. */
export default function DashboardPage() {
  // The activity filters live in the URL (useSearchParams → Suspense).
  return (
    <Suspense fallback={<Spinner />}>
      <DashboardView />
    </Suspense>
  );
}
