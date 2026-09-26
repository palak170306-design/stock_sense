import { ManagerOnly } from "@/components/ManagerOnly";
import { PageHeader } from "@/components/ui";
import { TransferForm } from "./TransferForm";

export const metadata = { title: "New transfer · StockSense" };

export default function NewTransferPage() {
  return (
    <>
      <PageHeader title="New internal transfer" description="Saved as a draft. Stock moves only when the transfer is validated." />
      <ManagerOnly>
        <TransferForm />
      </ManagerOnly>
    </>
  );
}
