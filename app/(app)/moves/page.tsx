import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import { MoveHistory } from "./MoveHistory";

export const metadata = { title: "Move history · StockSense" };

export default function MovesPage() {
  // MoveHistory keeps its filters in the URL (useSearchParams → Suspense).
  return (
    <Suspense fallback={<Spinner />}>
      <MoveHistory />
    </Suspense>
  );
}
