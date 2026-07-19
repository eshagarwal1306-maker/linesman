"use client";

import type { MarketDetail } from "@/lib/sources/mock";
import { TeamCrest } from "@/components/linesman/team-crest";
import { PriceCompareRow } from "@/components/linesman/price-compare-row";
import { DetailGapChart } from "@/components/linesman/detail-gap-chart";
import { HowWePriceThis } from "@/components/linesman/how-we-price-this";
import { VerifyStrip } from "@/components/linesman/verify-strip";
import { MarketDetailActionBar } from "@/components/linesman/market-detail-action-bar";
import { formatKickoffCountdown } from "@/lib/format";
import { IconArrowUpRight } from "@/components/linesman/icons";

export function MarketDetailView({ detail }: { detail: MarketDetail }) {
  const { sharp, edges, gapHistory, bookSelections } = detail;
  const bestVenue = [...detail.venuePrices].sort((a, b) => (b.liquidityUsd ?? 0) - (a.liquidityUsd ?? 0))[0];

  return (
    <div className="flex flex-col gap-5">
      <div
        className="rounded-[22px] p-5 shadow-[0_20px_44px_-24px_rgba(0,0,0,0.7)]"
        style={{
          background: `linear-gradient(135deg, ${sharp.homeTeam.primaryColor} 0%, var(--color-bg) 55%, ${sharp.awayTeam.primaryColor} 100%)`,
        }}
      >
        <p className="text-xs uppercase tracking-wide text-white/80">{sharp.competition} · {sharp.market.replace("_", " ")}</p>
        <div className="mt-3 flex items-center justify-center gap-4">
          <div className="flex flex-col items-center gap-1.5">
            <TeamCrest team={sharp.homeTeam} size="lg" />
            <span className="text-sm font-semibold text-white">{sharp.homeTeam.name}</span>
          </div>
          <span className="font-display text-lg text-white/70">vs</span>
          <div className="flex flex-col items-center gap-1.5">
            <TeamCrest team={sharp.awayTeam} size="lg" />
            <span className="text-sm font-semibold text-white">{sharp.awayTeam.name}</span>
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-white/80">
          {sharp.isLive ? "Live now" : formatKickoffCountdown(sharp.kickoffTime)}
        </p>
      </div>

      <div>
        <h1 className="font-display text-xl text-[color:var(--color-text)]">{sharp.selectionLabel}</h1>
        <p className="text-sm text-[color:var(--color-muted)]">Sharp fair value {(sharp.fairProb * 100).toFixed(1)}%</p>
      </div>

      <div className="flex flex-col gap-3">
        {edges.map((edge) => (
          <PriceCompareRow key={`${edge.outcomeId}:${edge.venue.venue}`} edge={edge} />
        ))}
      </div>

      <div className="rounded-[22px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-[color:var(--color-muted)]">Gap, last 2 hours</p>
        <DetailGapChart history={gapHistory} kickoffTime={sharp.kickoffTime} />
      </div>

      <HowWePriceThis bookSelections={bookSelections} />

      <VerifyStrip proofRef={sharp.proofRef} packetTimestamp={sharp.packetTimestamp} fixtureId={sharp.fixtureId} />

      {/* Desktop keeps the trade CTA inline; mobile gets it (plus a quick verify shortcut) in the thumb-reach sticky bar below. */}
      {bestVenue && (
        <a
          href={bestVenue.venueUrl}
          target="_blank"
          rel="noreferrer"
          className="hidden items-center justify-center gap-1.5 rounded-full py-3.5 text-center text-sm font-semibold text-[color:var(--color-bg)] transition-transform active:scale-[0.98] lg:flex"
          style={{ background: "var(--color-accent)" }}
        >
          Trade on {bestVenue.venue === "polymarket" ? "Polymarket" : "Kalshi"}
          <IconArrowUpRight className="h-4 w-4" />
        </a>
      )}

      <MarketDetailActionBar fixtureId={sharp.fixtureId} proofRef={sharp.proofRef} bestVenue={bestVenue} />
    </div>
  );
}
