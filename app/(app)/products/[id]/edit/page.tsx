import { ManagerOnly } from "@/components/ManagerOnly";
import { PageHeader } from "@/components/ui";
import { ProductForm } from "../../ProductForm";

export const metadata = { title: "Edit product · StockSense" };

export default async function EditProductPage({ params }: PageProps<"/products/[id]/edit">) {
  const { id } = await params;
  return (
    <>
      <PageHeader title="Edit product" />
      <ManagerOnly>
        <ProductForm productId={id} />
      </ManagerOnly>
    </>
  );
}
