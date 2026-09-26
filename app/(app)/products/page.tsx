import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import { ProductList } from "./ProductList";

export const metadata = { title: "Products · StockSense" };

export default function ProductsPage() {
  // ProductList reads the URL's search params, which requires a Suspense boundary.
  return (
    <Suspense fallback={<Spinner />}>
      <ProductList />
    </Suspense>
  );
}
