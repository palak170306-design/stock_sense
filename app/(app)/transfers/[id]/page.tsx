import { TransferDetailView } from "./TransferDetailView";

export const metadata = { title: "Transfer · StockSense" };

export default async function TransferPage({ params }: PageProps<"/transfers/[id]">) {
  const { id } = await params;
  return <TransferDetailView id={id} />;
}
