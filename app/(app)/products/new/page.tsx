import { ManagerOnly } from "@/components/ManagerOnly";
import { PageHeader } from "@/components/ui";
import { ProductForm } from "../ProductForm";

export const metadata = { title: "New product · StockSense" };

export default function NewProductPage() {
  return (
    <>
      <PageHeader title="New product" />
      <ManagerOnly>
        <ProductForm />
      </ManagerOnly>
    </>
  );
}
