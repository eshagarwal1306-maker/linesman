import type { Edge } from "@/lib/types";
import { formatCents, formatLiquidity, formatSignedPct } from "@/lib/format";

const VENUE_LABEL: Record<Edge["venue"]["venue"], string> = {
  polymarket: "Polymarket",
  kalshi: "Kalshi",
};

export function PriceCompareRow({ edge }: { edge: Edge }) {
  const fairPct = edge.sharp.fairProb * 100;
  const pricePct = edge.venue.yesPrice * 100;
  const positive = edge.direction === "underpriced";
  const color = positive ? "var(--color-accent)" : "var(--color-alert)";

  return (
    <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-[color:var(--color-text)]">{VENUE_LABEL[edge.venue.venue]}</span>
        <span className="font-display text-base" style={{ color }}>
          {formatSignedPct(edge.evPct, 0)} EV
        </span>
      </div>
      <div className="relative mt-3 h-2 rounded-full bg-[color:var(--color-border)]">
        <div
          className="absolute inset-y-0 left-0 rounded-full opacity-40"
          style={{ width: `${Math.min(100, pricePct)}%`, background: color }}
        />
        <span
          className="absolute -top-1.5 h-5 w-[3px] rounded bg-[color:var(--color-text)]"
          style={{ left: `${Math.min(100, fairPct)}%` }}
          title={`Fair ${fairPct.toFixed(1)}%`}
        />
        <span
          className="absolute -top-1 h-4 w-4 -translate-x-1/2 rounded-full border-2"
          style={{ left: `${Math.min(100, pricePct)}%`, borderColor: color, background: "var(--color-bg)" }}
          title={`${VENUE_LABEL[edge.venue.venue]} ${pricePct.toFixed(1)}%`}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-[color:var(--color-muted)]">
        <span>
          {VENUE_LABEL[edge.venue.venue]} {formatCents(edge.venue.yesPrice)} vs fair {fairPct.toFixed(0)}%
        </span>
        <span>{formatLiquidity(edge.venue.liquidityUsd)} liquidity</span>
      </div>
    </div>
  );
}
