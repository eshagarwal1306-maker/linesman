import type { DevigMethod } from "@/lib/types";

/** 1 / decimal odds. */
export function impliedProbFromDecimalOdds(decimalOdds: number): number {
  if (decimalOdds <= 1) throw new Error("Decimal odds must be greater than 1");
  return 1 / decimalOdds;
}

/**
 * Multiplicative de-vig: scale every implied probability by the same factor
 * so the book sums to exactly 1. Simple, fast, and the standard baseline —
 * but it distorts favourites and longshots by the same proportional amount.
 */
export function devigMultiplicative(probs: number[]): number[] {
  const total = probs.reduce((sum, p) => sum + p, 0);
  if (total <= 0) throw new Error("Book probabilities must be positive");
  return probs.map((p) => p / total);
}

/**
 * Power de-vig: find k such that sum(p_i ^ k) = 1, then return p_i ^ k.
 * Solved by bisection. This shrinks the overround more where the raw
 * probability is closer to certainty, which tends to match bookmaker
 * margin behaviour better than the multiplicative method — used as the
 * default here.
 */
export function devigPower(probs: number[], tolerance = 1e-9, maxIterations = 100): number[] {
  if (probs.some((p) => p <= 0 || p >= 1)) {
    throw new Error("Power de-vig requires probabilities strictly between 0 and 1");
  }

  const sumPow = (k: number) => probs.reduce((sum, p) => sum + Math.pow(p, k), 0);

  let lo = 0.1;
  let hi = 10;
  // Widen bounds if needed so sumPow(lo) > 1 > sumPow(hi).
  while (sumPow(lo) <= 1 && lo > 1e-6) lo /= 2;
  while (sumPow(hi) >= 1 && hi < 1e6) hi *= 2;

  let k = 1;
  for (let i = 0; i < maxIterations; i += 1) {
    k = (lo + hi) / 2;
    const total = sumPow(k);
    if (Math.abs(total - 1) < tolerance) break;
    if (total > 1) {
      lo = k;
    } else {
      hi = k;
    }
  }

  return probs.map((p) => Math.pow(p, k));
}

/** Dispatch to the requested de-vig method. Power is the recommended default. */
export function devigBook(probs: number[], method: DevigMethod = "power"): number[] {
  return method === "power" ? devigPower(probs) : devigMultiplicative(probs);
}

/**
 * Standard deviation of the last N raw implied probabilities for one
 * outcome, used as a line-stability signal for confidence scoring.
 */
export function lineStabilitySigma(recentProbs: number[]): number {
  if (recentProbs.length < 2) return 0;
  const mean = recentProbs.reduce((sum, p) => sum + p, 0) / recentProbs.length;
  const variance =
    recentProbs.reduce((sum, p) => sum + (p - mean) ** 2, 0) / recentProbs.length;
  return Math.sqrt(variance);
}
