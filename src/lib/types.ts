/**
 * Core domain types for Linesman.
 *
 * Every data source (sharp line feed, venue price feed) is described by an
 * interface here so the UI and engine never depend on where the data
 * actually comes from. `lib/sources/mock.ts` implements these interfaces
 * today; `lib/sources/txline.ts`, `polymarket.ts`, and `kalshi.ts` will
 * implement the same interfaces against real APIs later without any
 * component or engine code changing.
 */

export type OutcomeId = string; // `${fixtureId}:${market}:${selection}`

export type Venue = "polymarket" | "kalshi";

export type MarketType = "1x2" | "winner" | "over_under" | "btts";

export type Confidence = "high" | "medium" | "low";

export type EdgeDirection = "underpriced" | "overpriced";

export type DevigMethod = "multiplicative" | "power";

export interface Team {
  code: string; // "FRA"
  name: string; // "France"
  crestUrl?: string;
  primaryColor: string; // hex
  secondaryColor: string; // hex
}

export interface ProofRef {
  slot?: number;
  txSignature?: string;
  merkleRoot?: string;
  network?: "devnet" | "mainnet";
  epochDay?: number;
}

export interface SharpLine {
  outcomeId: OutcomeId;
  fixtureId: string;
  /** Free-form: "WC2026" for the curated mock/replay story, or TxLINE's real competition name once live. */
  competition: string;
  homeTeam: Team;
  awayTeam: Team;
  market: MarketType;
  selectionLabel: string;
  decimalOdds: number;
  impliedProb: number; // raw, pre-devig
  fairProb: number; // post-devig (engine fills)
  packetTimestamp: number;
  proofRef: ProofRef;
  kickoffTime: number;
  isLive: boolean;
}

export interface VenuePrice {
  outcomeId: OutcomeId;
  venue: Venue;
  venueMarketId: string;
  question: string;
  yesPrice: number; // 0..1
  liquidityUsd?: number;
  fetchedAt: number;
  venueUrl: string;
}

export interface GapPoint {
  t: number;
  gapPct: number;
}

export interface Edge {
  outcomeId: OutcomeId;
  sharp: SharpLine;
  venue: VenuePrice;
  evPct: number; // signed
  direction: EdgeDirection;
  confidence: Confidence;
  gapHistory: GapPoint[];
}

export type AuditVerdict = "correct" | "incorrect" | "late" | "unresolved";

export interface SettlementAudit {
  venueMarketId: string;
  venue: Venue;
  question: string;
  fixtureId: string;
  provenResult: string;
  venueResolution: string;
  resolvedAt?: number;
  fullTimeAt: number;
  verdict: AuditVerdict;
  lagMinutes?: number;
  proofRef: ProofRef;
}

/** A single sharp-line update as it comes off the wire (SSE packet or mock tick). */
export type SharpLinePacket = SharpLine;

export interface SharpLineSource {
  /** Point-in-time read of every currently known sharp line. */
  snapshot(): Promise<SharpLine[]>;
  /** Subscribe to live packet updates; returns an unsubscribe function. */
  subscribe(onPacket: (line: SharpLinePacket) => void): () => void;
}

export interface VenueSource {
  readonly venue: Venue;
  /** Poll for the latest set of venue prices for mapped outcomes. */
  poll(): Promise<VenuePrice[]>;
}

/** Raw input for the settlement watchdog before verdict computation. */
export interface ClosedMarketRecord {
  venueMarketId: string;
  venue: Venue;
  question: string;
  fixtureId: string;
  provenResult: string;
  venueResolution: string;
  resolvedAt?: number;
  fullTimeAt: number;
  proofRef: ProofRef;
}
