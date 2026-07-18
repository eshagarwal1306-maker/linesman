import type {
  ClosedMarketRecord,
  Edge,
  GapPoint,
  MarketType,
  ProofRef,
  SharpLine,
  SharpLineSource,
  Team,
  Venue,
  VenuePrice,
  VenueSource,
} from "@/lib/types";
import { devigBook, impliedProbFromDecimalOdds } from "@/lib/engine/devig";
import { computeEdge, filterEdges, rankEdges } from "@/lib/engine/edge";

// ---------------------------------------------------------------------------
// Deterministic PRNG — mulberry32. Seeded so the "story" numbers reproduce
// across server restarts, with a small live-feel wiggle keyed to a 20s time
// bucket (matching the real venue polling cadence in the engine rules).
// ---------------------------------------------------------------------------

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rngFor(...parts: (string | number)[]): () => number {
  return mulberry32(hashString(parts.join("|")));
}

const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function fakeBase58(rng: () => number, length: number): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += BASE58_ALPHABET[Math.floor(rng() * BASE58_ALPHABET.length)];
  }
  return out;
}

function fakeHex(rng: () => number, bytes: number): string {
  let out = "";
  for (let i = 0; i < bytes; i += 1) {
    out += Math.floor(rng() * 256)
      .toString(16)
      .padStart(2, "0");
  }
  return out;
}

function fakeProofRef(seed: string, timestamp: number): ProofRef {
  const rng = rngFor("proof", seed);
  return {
    slot: 312_441_000 + Math.floor(rng() * 20_000),
    txSignature: fakeBase58(rng, 88),
    merkleRoot: fakeHex(rng, 32),
    network: "devnet",
    epochDay: Math.floor(timestamp / 86_400_000),
  };
}

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

const TEAM: Record<string, Team> = {
  FRA: { code: "FRA", name: "France", primaryColor: "#0055A4", secondaryColor: "#EF4135" },
  ARG: { code: "ARG", name: "Argentina", primaryColor: "#6CACE4", secondaryColor: "#FCD116" },
  POR: { code: "POR", name: "Portugal", primaryColor: "#FF0000", secondaryColor: "#046A38" },
  BRA: { code: "BRA", name: "Brazil", primaryColor: "#009C3B", secondaryColor: "#FFDF00" },
  ENG: { code: "ENG", name: "England", primaryColor: "#CE1124", secondaryColor: "#1D2951" },
  ESP: { code: "ESP", name: "Spain", primaryColor: "#AA151B", secondaryColor: "#F1BF00" },
  GER: { code: "GER", name: "Germany", primaryColor: "#DD0000", secondaryColor: "#FFCE00" },
  NED: { code: "NED", name: "Netherlands", primaryColor: "#FF6600", secondaryColor: "#21468B" },
  MAR: { code: "MAR", name: "Morocco", primaryColor: "#C1272D", secondaryColor: "#006233" },
  CRO: { code: "CRO", name: "Croatia", primaryColor: "#ED2939", secondaryColor: "#171796" },
  URU: { code: "URU", name: "Uruguay", primaryColor: "#5CB8E4", secondaryColor: "#FCD116" },
  USA: { code: "USA", name: "United States", primaryColor: "#B22234", secondaryColor: "#3C3B6E" },
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NOW = () => Date.now();

interface FixtureDef {
  id: string;
  home: Team;
  away: Team;
  stage: string;
  kickoffTime: number;
  fullTimeAt?: number; // set when the fixture has finished
  isLive: boolean;
}

function headlineFixtures(): FixtureDef[] {
  const now = NOW();
  return [
    {
      id: "wc26-final",
      home: TEAM.FRA,
      away: TEAM.ARG,
      stage: "Final",
      kickoffTime: now - 70 * 60_000,
      isLive: true,
    },
    {
      id: "wc26-third-place",
      home: TEAM.POR,
      away: TEAM.BRA,
      stage: "3rd Place Play-off",
      kickoffTime: now - 40 * 60_000,
      isLive: true,
    },
  ];
}

const BULK_PAIRS: [string, string][] = [
  ["ENG", "ESP"],
  ["GER", "NED"],
  ["MAR", "CRO"],
  ["URU", "USA"],
  ["FRA", "MAR"],
  ["ARG", "NED"],
  ["ENG", "BRA"],
  ["ESP", "GER"],
  ["POR", "URU"],
  ["CRO", "USA"],
  ["NED", "ARG"],
  ["GER", "ENG"],
];

function bulkFixtures(): FixtureDef[] {
  const now = NOW();
  return BULK_PAIRS.map(([homeCode, awayCode], index) => {
    const daysAgo = 2 + index * 0.8;
    const kickoffTime = now - daysAgo * 86_400_000;
    return {
      id: `wc26-bulk-${index}`,
      home: TEAM[homeCode],
      away: TEAM[awayCode],
      stage: index < 4 ? "Round of 16" : index < 8 ? "Quarter-final" : "Semi-final",
      kickoffTime,
      fullTimeAt: kickoffTime + 105 * 60_000,
      isLive: false,
    };
  });
}

// ---------------------------------------------------------------------------
// Sharp lines (raw odds -> devig -> fair prob), curated for the demo story.
// ---------------------------------------------------------------------------

interface RawSelection {
  fixture: FixtureDef;
  market: MarketType;
  selectionLabel: string;
  outcomeSuffix: string;
  decimalOdds: number;
}

/**
 * Every raw selection for the two headline fixtures, grouped into books
 * (all selections of one market on one fixture) so de-vig operates
 * correctly across the whole book, not per-selection.
 */
function headlineRawSelections(fixtures: FixtureDef[]): RawSelection[] {
  const [final, third] = fixtures;
  return [
    // Final — winner market. This is the France story: fair rose 58% -> 63%
    // while Polymarket sat still at 54c. These are the *current* (latest)
    // odds; buildGapHistory() replays the drift for the sparkline.
    { fixture: final, market: "winner", selectionLabel: `${final.home.name} to win`, outcomeSuffix: "FRA", decimalOdds: 1.58 },
    { fixture: final, market: "winner", selectionLabel: `${final.away.name} to win`, outcomeSuffix: "ARG", decimalOdds: 2.70 },
    // Final — over/under 2.5 goals.
    { fixture: final, market: "over_under", selectionLabel: "Over 2.5 goals", outcomeSuffix: "OVER", decimalOdds: 2.05 },
    { fixture: final, market: "over_under", selectionLabel: "Under 2.5 goals", outcomeSuffix: "UNDER", decimalOdds: 1.83 },
    // Final — both teams to score.
    { fixture: final, market: "btts", selectionLabel: "Both teams to score", outcomeSuffix: "YES", decimalOdds: 1.95 },
    { fixture: final, market: "btts", selectionLabel: "Both teams to score - No", outcomeSuffix: "NO", decimalOdds: 1.92 },

    // 3rd place — winner market.
    { fixture: third, market: "winner", selectionLabel: `${third.home.name} to win`, outcomeSuffix: "POR", decimalOdds: 2.30 },
    { fixture: third, market: "winner", selectionLabel: `${third.away.name} to win`, outcomeSuffix: "BRA", decimalOdds: 1.68 },
    // 3rd place — over/under 2.5 goals.
    { fixture: third, market: "over_under", selectionLabel: "Over 2.5 goals", outcomeSuffix: "OVER", decimalOdds: 1.90 },
    { fixture: third, market: "over_under", selectionLabel: "Under 2.5 goals", outcomeSuffix: "UNDER", decimalOdds: 2.00 },
    // 3rd place — both teams to score.
    { fixture: third, market: "btts", selectionLabel: "Both teams to score", outcomeSuffix: "YES", decimalOdds: 1.80 },
    { fixture: third, market: "btts", selectionLabel: "Both teams to score - No", outcomeSuffix: "NO", decimalOdds: 2.10 },
  ];
}

function buildOutcomeId(fixtureId: string, market: MarketType, suffix: string): string {
  return `${fixtureId}:${market}:${suffix}`;
}

function jitter(rng: () => number, magnitude: number): number {
  return 1 + (rng() * 2 - 1) * magnitude;
}

/** Live-feel wiggle bucket: changes every 20s (matches venue polling cadence). */
function timeBucket(): number {
  return Math.floor(NOW() / 20_000);
}

function buildHeadlineSharpLines(): SharpLine[] {
  const fixtures = headlineFixtures();
  const raw = headlineRawSelections(fixtures);
  const bucket = timeBucket();

  // Group into books by fixture+market so de-vig runs on the full book.
  const books = new Map<string, RawSelection[]>();
  for (const selection of raw) {
    const key = `${selection.fixture.id}:${selection.market}`;
    const group = books.get(key) ?? [];
    group.push(selection);
    books.set(key, group);
  }

  const lines: SharpLine[] = [];
  for (const [, selections] of books) {
    const rng = rngFor("sharp-book", selections[0].fixture.id, selections[0].market, bucket);
    const impliedProbs = selections.map((selection) =>
      impliedProbFromDecimalOdds(selection.decimalOdds * jitter(rng, 0.01)),
    );
    const fairProbs = devigBook(impliedProbs, "power");

    selections.forEach((selection, index) => {
      const outcomeId = buildOutcomeId(selection.fixture.id, selection.market, selection.outcomeSuffix);
      lines.push({
        outcomeId,
        fixtureId: selection.fixture.id,
        competition: "WC2026",
        homeTeam: selection.fixture.home,
        awayTeam: selection.fixture.away,
        market: selection.market,
        selectionLabel: selection.selectionLabel,
        decimalOdds: 1 / impliedProbs[index],
        impliedProb: impliedProbs[index],
        fairProb: fairProbs[index],
        packetTimestamp: NOW(),
        proofRef: fakeProofRef(outcomeId, NOW()),
        kickoffTime: selection.fixture.kickoffTime,
        isLive: selection.fixture.isLive,
      });
    });
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Venue prices — curated so exactly the "8 live edges" story clears the
// filter thresholds (|ev| >= 3%, liquidity >= $500, confidence >= medium).
// ---------------------------------------------------------------------------

interface RawVenueQuote {
  outcomeSuffixKey: string; // `${fixtureId}:${market}:${suffix}`
  venue: Venue;
  question: string;
  yesPrice: number;
  liquidityUsd: number;
}

function headlineVenueQuotes(fixtures: FixtureDef[]): RawVenueQuote[] {
  const [final, third] = fixtures;
  const finalKey = (market: string, suffix: string) => `${final.id}:${market}:${suffix}`;
  const thirdKey = (market: string, suffix: string) => `${third.id}:${market}:${suffix}`;

  return [
    // The France story — Polymarket badly lagging the sharp line's rise.
    {
      outcomeSuffixKey: finalKey("winner", "FRA"),
      venue: "polymarket",
      question: "Will France win the World Cup Final?",
      yesPrice: 0.54,
      liquidityUsd: 48_000,
    },
    {
      outcomeSuffixKey: finalKey("winner", "ARG"),
      venue: "kalshi",
      question: "Will Argentina win the World Cup Final?",
      yesPrice: 0.47,
      liquidityUsd: 21_000,
    },
    {
      outcomeSuffixKey: finalKey("over_under", "OVER"),
      venue: "polymarket",
      question: "Will the Final have over 2.5 goals?",
      yesPrice: 0.44,
      liquidityUsd: 9_500,
    },
    {
      outcomeSuffixKey: finalKey("btts", "YES"),
      venue: "kalshi",
      question: "Will both teams score in the Final?",
      yesPrice: 0.47,
      liquidityUsd: 3_200,
    },
    {
      outcomeSuffixKey: thirdKey("winner", "POR"),
      venue: "polymarket",
      question: "Will Portugal win the 3rd place play-off?",
      yesPrice: 0.36,
      liquidityUsd: 6_800,
    },
    {
      outcomeSuffixKey: thirdKey("winner", "BRA"),
      venue: "kalshi",
      question: "Will Brazil win the 3rd place play-off?",
      yesPrice: 0.65,
      liquidityUsd: 14_500,
    },
    {
      outcomeSuffixKey: thirdKey("over_under", "UNDER"),
      venue: "polymarket",
      question: "Will the 3rd place play-off have under 2.5 goals?",
      yesPrice: 0.42,
      liquidityUsd: 2_100,
    },
    {
      outcomeSuffixKey: thirdKey("btts", "NO"),
      venue: "kalshi",
      question: "Will both teams fail to score in the 3rd place play-off?",
      yesPrice: 0.5,
      liquidityUsd: 1_400,
    },
    // Thin market kept for market-detail comparison rows — below the
    // feed's liquidity floor, so it never crowds out the 8 headline edges.
    {
      outcomeSuffixKey: finalKey("winner", "FRA"),
      venue: "kalshi",
      question: "Will France win the World Cup Final?",
      yesPrice: 0.59,
      liquidityUsd: 300,
    },
  ];
}

function venueUrl(venue: Venue, venueMarketId: string): string {
  return venue === "polymarket"
    ? `https://polymarket.com/event/${venueMarketId}`
    : `https://kalshi.com/markets/${venueMarketId}`;
}

function buildHeadlineVenuePrices(): VenuePrice[] {
  const fixtures = headlineFixtures();
  const quotes = headlineVenueQuotes(fixtures);
  const bucket = timeBucket();

  return quotes.map((quote) => {
    const rng = rngFor("venue", quote.outcomeSuffixKey, quote.venue, bucket);
    const yesPrice = Math.min(0.99, Math.max(0.01, quote.yesPrice * jitter(rng, 0.015)));
    const venueMarketId = `${quote.venue}-${hashString(quote.outcomeSuffixKey + quote.venue).toString(36)}`;
    return {
      outcomeId: quote.outcomeSuffixKey,
      venue: quote.venue,
      venueMarketId,
      question: quote.question,
      yesPrice,
      liquidityUsd: quote.liquidityUsd,
      fetchedAt: NOW(),
      venueUrl: venueUrl(quote.venue, venueMarketId),
    };
  });
}

// ---------------------------------------------------------------------------
// Gap history (2h ring buffer) — the France outcome gets the dramatic swing.
// ---------------------------------------------------------------------------

const GAP_HISTORY_POINTS = 24;
const GAP_HISTORY_SPAN_MS = 2 * 60 * 60_000;

function buildGapHistory(outcomeId: string, currentFairProb: number, currentYesPrice: number): GapPoint[] {
  const now = NOW();
  const isFranceStory = outcomeId === "wc26-final:winner:FRA";
  const rng = rngFor("gap-history", outcomeId);

  const points: GapPoint[] = [];
  for (let i = 0; i < GAP_HISTORY_POINTS; i += 1) {
    const t = now - GAP_HISTORY_SPAN_MS + (i * GAP_HISTORY_SPAN_MS) / (GAP_HISTORY_POINTS - 1);
    const progress = i / (GAP_HISTORY_POINTS - 1);

    let fairAtT: number;
    let priceAtT: number;
    if (isFranceStory) {
      // Fair line drifts 0.58 -> current (~0.63); Polymarket barely moves.
      fairAtT = 0.58 + (currentFairProb - 0.58) * progress + (rng() - 0.5) * 0.006;
      priceAtT = currentYesPrice + (rng() - 0.5) * 0.01;
    } else {
      fairAtT = currentFairProb + (rng() - 0.5) * 0.02 * (1 - progress * 0.5);
      priceAtT = currentYesPrice + (rng() - 0.5) * 0.02 * (1 - progress * 0.5);
    }

    const gapPct = (fairAtT / Math.max(priceAtT, 0.01) - 1) * 100;
    points.push({ t: Math.round(t), gapPct: Math.round(gapPct * 10) / 10 });
  }
  return points;
}

// ---------------------------------------------------------------------------
// Public snapshot builders
// ---------------------------------------------------------------------------

export function getMockSharpLines(): SharpLine[] {
  return buildHeadlineSharpLines();
}

export function getMockVenuePrices(): VenuePrice[] {
  return buildHeadlineVenuePrices();
}

/** Run the real devig -> edge -> filter -> rank pipeline over the mock snapshot. */
export function getMockEdges(): Edge[] {
  const sharpLines = getMockSharpLines();
  const venuePrices = getMockVenuePrices();
  const sharpByOutcome = new Map(sharpLines.map((line) => [line.outcomeId, line]));

  const edges = venuePrices
    .map((venue) => {
      const sharp = sharpByOutcome.get(venue.outcomeId);
      if (!sharp) return null;
      const rng = rngFor("sigma", venue.outcomeId);
      const recentImpliedProbs = Array.from({ length: 6 }, () => sharp.impliedProb * jitter(rng, 0.008));
      return computeEdge({
        sharp,
        venue,
        gapHistory: buildGapHistory(venue.outcomeId, sharp.fairProb, venue.yesPrice),
        recentImpliedProbs,
        mappingConfidence: "high",
      });
    })
    .filter((edge): edge is Edge => edge !== null);

  return rankEdges(filterEdges(edges));
}

/** All computed edges regardless of threshold, keyed for market-detail lookups. */
export function getMockAllOutcomePrices(): { sharpLines: SharpLine[]; venuePrices: VenuePrice[] } {
  return { sharpLines: getMockSharpLines(), venuePrices: getMockVenuePrices() };
}

export interface MarketDetail {
  sharp: SharpLine;
  venuePrices: VenuePrice[];
  edges: Edge[];
  gapHistory: GapPoint[];
  bookSelections: SharpLine[]; // every selection in the same market book, for "how we price this"
}

/** Everything the market-detail screen needs for one outcome, computed through the real pipeline. */
export function getMarketDetail(outcomeId: string): MarketDetail | null {
  const sharpLines = getMockSharpLines();
  const sharp = sharpLines.find((line) => line.outcomeId === outcomeId);
  if (!sharp) return null;

  const venuePrices = getMockVenuePrices().filter((price) => price.outcomeId === outcomeId);
  const bookSelections = sharpLines.filter(
    (line) => line.fixtureId === sharp.fixtureId && line.market === sharp.market,
  );

  const edges = venuePrices.map((venue) => {
    const rng = rngFor("sigma", venue.outcomeId, venue.venue);
    const recentImpliedProbs = Array.from({ length: 6 }, () => sharp.impliedProb * jitter(rng, 0.008));
    return computeEdge({
      sharp,
      venue,
      gapHistory: buildGapHistory(venue.outcomeId, sharp.fairProb, venue.yesPrice),
      recentImpliedProbs,
      mappingConfidence: "high",
    });
  });

  const primaryVenue = venuePrices[0];
  const gapHistory = primaryVenue ? buildGapHistory(outcomeId, sharp.fairProb, primaryVenue.yesPrice) : [];

  return { sharp, venuePrices, edges, gapHistory, bookSelections };
}

// ---------------------------------------------------------------------------
// Settlement watchdog bulk data — 140 audited markets: 137 correct, 2 late,
// 1 incorrect (deterministic indices so the story never flickers).
// ---------------------------------------------------------------------------

const MARKET_SELECTIONS: { market: MarketType; suffix: string; label: (home: string, away: string) => string }[] = [
  { market: "winner", suffix: "HOME", label: (home) => `${home} to win` },
  { market: "winner", suffix: "AWAY", label: (_home, away) => `${away} to win` },
  { market: "over_under", suffix: "OVER", label: () => "Over 2.5 goals" },
  { market: "over_under", suffix: "UNDER", label: () => "Under 2.5 goals" },
  { market: "btts", suffix: "YES", label: () => "Both teams to score" },
  { market: "btts", suffix: "NO", label: () => "Both teams to score - No" },
];

const LATE_INDICES = new Set([13, 77]);
const INCORRECT_INDEX = 100;
const TOTAL_AUDITS = 140;

export function getMockClosedMarkets(): ClosedMarketRecord[] {
  const fixtures = bulkFixtures();
  const venues: Venue[] = ["polymarket", "kalshi"];
  const records: ClosedMarketRecord[] = [];

  let index = 0;
  outer: for (const fixture of fixtures) {
    for (const venue of venues) {
      for (const selection of MARKET_SELECTIONS) {
        if (index >= TOTAL_AUDITS) break outer;

        const rng = rngFor("audit", fixture.id, venue, selection.suffix);
        const fullTimeAt = fixture.fullTimeAt ?? fixture.kickoffTime + 105 * 60_000;
        const provenResult = selection.suffix;

        let venueResolution = provenResult;
        let lagMinutes = 5 + Math.floor(rng() * 40);
        if (index === INCORRECT_INDEX) {
          venueResolution = provenResult === "HOME" ? "AWAY" : provenResult === "OVER" ? "UNDER" : "NO";
        } else if (LATE_INDICES.has(index)) {
          lagMinutes = 130 + Math.floor(rng() * 150);
        }

        const venueMarketId = `${venue}-${fixture.id}-${selection.suffix}`.toLowerCase();
        records.push({
          venueMarketId,
          venue,
          question: `${selection.label(fixture.home.name, fixture.away.name)}? (${fixture.home.code} vs ${fixture.away.code})`,
          fixtureId: fixture.id,
          provenResult,
          venueResolution,
          resolvedAt: fullTimeAt + lagMinutes * 60_000,
          fullTimeAt,
          proofRef: fakeProofRef(venueMarketId, fullTimeAt),
        });
        index += 1;
      }
    }
  }
  return records;
}

export function getHeadlineFixtures(): FixtureDef[] {
  return headlineFixtures();
}

export function getBulkFixtures(): FixtureDef[] {
  return bulkFixtures();
}

export function getAllFixtures(): FixtureDef[] {
  return [...headlineFixtures(), ...bulkFixtures()];
}

export function getFixtureLabel(fixtureId: string): string {
  const fixture = getAllFixtures().find((item) => item.id === fixtureId);
  if (!fixture) return fixtureId;
  return `${fixture.home.code} vs ${fixture.away.code}`;
}

export function getTeam(code: string): Team | undefined {
  return TEAM[code];
}

// ---------------------------------------------------------------------------
// SharpLineSource / VenueSource interface implementations
// ---------------------------------------------------------------------------

export class MockSharpLineSource implements SharpLineSource {
  async snapshot(): Promise<SharpLine[]> {
    return getMockSharpLines();
  }

  subscribe(onPacket: (line: SharpLine) => void): () => void {
    const interval = setInterval(() => {
      for (const line of getMockSharpLines()) onPacket(line);
    }, 5_000);
    return () => clearInterval(interval);
  }
}

export class MockVenueSource implements VenueSource {
  constructor(public readonly venue: Venue) {}

  async poll(): Promise<VenuePrice[]> {
    return getMockVenuePrices().filter((price) => price.venue === this.venue);
  }
}
