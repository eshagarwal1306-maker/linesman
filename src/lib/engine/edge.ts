import type { Confidence, Edge, GapPoint, SharpLine, VenuePrice } from "@/lib/types";
import { lineStabilitySigma } from "@/lib/engine/devig";

export const MIN_EV_PCT = 3;
export const MIN_LIQUIDITY_USD = 500;

const MAPPING_RANK: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };

interface EdgeInputs {
  sharp: SharpLine;
  venue: VenuePrice;
  gapHistory?: GapPoint[];
  recentImpliedProbs?: number[];
  mappingConfidence?: Confidence;
}

/** EV of the venue price versus the sharp fair probability, as a signed percentage. */
export function computeEvPct(fairProb: number, yesPrice: number): number {
  if (yesPrice <= 0) return 0;
  return (fairProb / yesPrice - 1) * 100;
}

function scoreConfidence({
  liquidityUsd,
  recentImpliedProbs,
  mappingConfidence = "high",
}: {
  liquidityUsd?: number;
  recentImpliedProbs?: number[];
  mappingConfidence?: Confidence;
}): Confidence {
  const sigma = recentImpliedProbs ? lineStabilitySigma(recentImpliedProbs) : 0;
  const liquid = (liquidityUsd ?? 0) >= 2_000;
  const stable = sigma < 0.02;
  const mappingRank = MAPPING_RANK[mappingConfidence];

  if (liquid && stable && mappingRank === MAPPING_RANK.high) return "high";
  if ((liquidityUsd ?? 0) >= MIN_LIQUIDITY_USD && mappingRank >= MAPPING_RANK.medium) {
    return "medium";
  }
  return "low";
}

/** Build one Edge from a matched sharp line + venue price pair. */
export function computeEdge({
  sharp,
  venue,
  gapHistory = [],
  recentImpliedProbs,
  mappingConfidence,
}: EdgeInputs): Edge {
  const evPct = computeEvPct(sharp.fairProb, venue.yesPrice);
  return {
    outcomeId: sharp.outcomeId,
    sharp,
    venue,
    evPct,
    direction: evPct >= 0 ? "underpriced" : "overpriced",
    confidence: scoreConfidence({
      liquidityUsd: venue.liquidityUsd,
      recentImpliedProbs,
      mappingConfidence,
    }),
    gapHistory,
  };
}

const CONFIDENCE_RANK: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };

/** Only surface edges worth a fan's attention. */
export function filterEdges(edges: Edge[]): Edge[] {
  return edges.filter(
    (edge) =>
      Math.abs(edge.evPct) >= MIN_EV_PCT &&
      (edge.venue.liquidityUsd ?? 0) >= MIN_LIQUIDITY_USD &&
      CONFIDENCE_RANK[edge.confidence] >= CONFIDENCE_RANK.medium,
  );
}

/** Rank by |EV| * log(liquidity) — big mispricings with real money behind them win. */
export function rankEdges(edges: Edge[]): Edge[] {
  return [...edges].sort((a, b) => rankScore(b) - rankScore(a));
}

export function rankScore(edge: Edge): number {
  const liquidity = Math.max(edge.venue.liquidityUsd ?? 1, 1);
  return Math.abs(edge.evPct) * Math.log(liquidity + 1);
}
