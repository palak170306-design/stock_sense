import { ManagerOnly } from "@/components/ManagerOnly";
import { PageHeader } from "@/components/ui";
import { AdjustmentForm } from "./AdjustmentForm";

export const metadata = { title: "New adjustment · StockSense" };

export default function NewAdjustmentPage() {
  return (
    <>
      <PageHeader title="New stock adjustment" description="Enter what you physically counted; the difference is booked immediately." />
      <ManagerOnly>
        <AdjustmentForm />
      </ManagerOnly>
    </>
  );
}
