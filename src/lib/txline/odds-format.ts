export type OddsTick = {
  fixtureId: number;
  messageId?: string;
  timestamp: number;
  marketType: string;
  marketLabel: string;
  line: string | null;
  period: string | null;
  inRunning: boolean;
  selections: Array<{
    key: string;
    label: string;
    decimalOdds: number | null;
    impliedPct: number | null;
  }>;
  raw: Record<string, unknown>;
};

const MARKET_LABELS: Record<string, string> = {
  "1X2_PARTICIPANT_RESULT": "Match result (1X2)",
  ASIANHANDICAP_PARTICIPANT_GOALS: "Asian handicap",
  OVERUNDER_PARTICIPANT_GOALS: "Over / under goals",
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function numberField(
  record: Record<string, unknown>,
  ...keys: string[]
): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function textField(
  record: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function parseLine(params: string | null): string | null {
  if (!params) return null;
  const match = /line=(-?\d+(?:\.\d+)?)/i.exec(params);
  return match?.[1] ?? params;
}

function parsePeriod(period: string | null): string | null {
  if (!period) return "Full match";
  if (period === "half=1") return "1st half";
  if (period === "half=2") return "2nd half";
  return period;
}

function selectionLabel(
  key: string,
  teams?: { home?: string; away?: string },
  line?: string | null,
): string {
  switch (key) {
    case "part1":
      return teams?.home ? teams.home : "Team 1";
    case "part2":
      return teams?.away ? teams.away : "Team 2";
    case "draw":
      return "Draw";
    case "over":
      return line ? `Over ${line}` : "Over";
    case "under":
      return line ? `Under ${line}` : "Under";
    default:
      return key;
  }
}

/** StablePrice integers are decimal odds × 1000. */
export function toDecimalOdds(price: number): number {
  return price / 1_000;
}

export function formatDecimalOdds(price: number | null): string {
  if (price === null || !Number.isFinite(price)) return "—";
  return price.toFixed(2);
}

export function formatPct(pct: number | null): string {
  if (pct === null || !Number.isFinite(pct)) return "—";
  return `${pct.toFixed(1)}%`;
}

export function decodeOddsMessage(
  payload: unknown,
  teams?: { home?: string; away?: string },
): OddsTick | null {
  const record = asRecord(payload);
  if (!record) return null;
  const fixtureId = numberField(record, "FixtureId", "fixtureId");
  const timestamp = numberField(record, "Ts", "ts", "timestamp");
  if (fixtureId === null || timestamp === null) return null;

  // Heartbeats are just { Ts }
  if (Object.keys(record).length === 1) return null;

  const marketType =
    textField(record, "SuperOddsType", "superOddsType") ?? "UNKNOWN";
  const params = textField(record, "MarketParameters", "marketParameters");
  const period = textField(record, "MarketPeriod", "marketPeriod");
  const line = parseLine(params);
  const priceNames = record.PriceNames ?? record.priceNames;
  const prices = record.Prices ?? record.prices;
  const pcts = record.Pct ?? record.pct;
  if (!Array.isArray(priceNames) || !Array.isArray(prices)) return null;

  const selections = priceNames.map((name, index) => {
    const key = String(name);
    const rawPrice = prices[index];
    const price =
      typeof rawPrice === "number"
        ? rawPrice
        : typeof rawPrice === "string"
          ? Number(rawPrice)
          : NaN;
    const rawPct = Array.isArray(pcts) ? pcts[index] : null;
    const pct =
      typeof rawPct === "number"
        ? rawPct
        : typeof rawPct === "string" && rawPct !== "NA"
          ? Number(rawPct)
          : NaN;
    return {
      key,
      label: selectionLabel(key, teams, line),
      decimalOdds: Number.isFinite(price) ? toDecimalOdds(price) : null,
      impliedPct: Number.isFinite(pct) ? pct : null,
    };
  });

  return {
    fixtureId,
    messageId: textField(record, "MessageId", "messageId") ?? undefined,
    timestamp,
    marketType,
    marketLabel: MARKET_LABELS[marketType] ?? marketType.replaceAll("_", " "),
    line,
    period: parsePeriod(period),
    inRunning: Boolean(record.InRunning ?? record.inRunning),
    selections,
    raw: record,
  };
}

export function marketKey(tick: OddsTick): string {
  return [tick.marketType, tick.period ?? "", tick.line ?? ""].join("|");
}
