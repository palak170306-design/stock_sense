import { ProductDetail } from "./ProductDetail";

export const metadata = { title: "Product · StockSense" };

export default async function ProductPage({ params }: PageProps<"/products/[id]">) {
  const { id } = await params;
  return <ProductDetail id={id} />;
}
