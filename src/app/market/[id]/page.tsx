import { notFound } from "next/navigation";
import { getSourceMarketDetail } from "@/lib/sources/manager";
import { MarketDetailView } from "@/components/linesman/market-detail-view";

export default async function MarketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const outcomeId = decodeURIComponent(id);
  const detail = getSourceMarketDetail(outcomeId);
  if (!detail) notFound();

  return <MarketDetailView detail={detail} />;
}
