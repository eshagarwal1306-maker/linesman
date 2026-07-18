import type { Edge } from "@/lib/types";

/**
 * Disagreement Index: a single 0–100 headline number for "how far apart are
 * the crowd (venue prices) and the sharps (TxLINE fair value) right now."
 * Liquidity-weighted mean of |EV| across every currently-surfaced edge,
 * rescaled so the curated demo/replay story reads roughly 35–65 and a
 * genuinely dramatic mispricing moment can spike well past that.
 */

const SCALE_FACTOR = 3.1;

export function computeDisagreementIndex(edges: readonly Edge[]): number {
  if (edges.length === 0) return 0;

  let weightedSum = 0;
  let weightTotal = 0;
  for (const edge of edges) {
    const weight = Math.log((edge.venue.liquidityUsd ?? 0) + 1);
    weightedSum += Math.abs(edge.evPct) * weight;
    weightTotal += weight;
  }
  const weightedMeanEv = weightTotal > 0 ? weightedSum / weightTotal : 0;
  return Math.max(0, Math.min(100, Math.round(weightedMeanEv * SCALE_FACTOR)));
}

export function disagreementLabel(score: number): string {
  if (score >= 80) return "Extreme — the crowd and the sharps are miles apart.";
  if (score >= 65) return "High — several markets are meaningfully mispriced.";
  if (score >= 35) return "The crowd and the sharps are far apart right now.";
  if (score >= 15) return "Modest — most markets track the sharp line closely.";
  return "Quiet — venues are tracking the sharp line closely.";
}

/** Deterministic pseudo-history so the sparkline has shape without extra state. */
export function buildDisagreementHistory(currentScore: number, points = 12): number[] {
  const history: number[] = [];
  for (let i = 0; i < points; i += 1) {
    const t = i / (points - 1);
    const wobble = Math.sin(t * Math.PI * 2.3) * 8 + Math.sin(t * Math.PI * 5.1) * 3;
    const trend = currentScore - (1 - t) * 10;
    history.push(Math.max(0, Math.min(100, Math.round(trend + wobble))));
  }
  history[history.length - 1] = currentScore;
  return history;
}
