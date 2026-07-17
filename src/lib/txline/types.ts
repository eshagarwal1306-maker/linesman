export type TxlineEvent = {
  source: "live" | "history";
  fixtureId: number;
  seq?: number;
  timestamp: number;
  payload: unknown;
};

function numericField(
  value: Record<string, unknown>,
  ...keys: string[]
): number | undefined {
  for (const key of keys) {
    if (typeof value[key] === "number" && Number.isFinite(value[key])) {
      return value[key];
    }
  }
}

export function normalizeScoreEvent(
  payload: unknown,
  source: TxlineEvent["source"],
): TxlineEvent {
  if (!payload || typeof payload !== "object") {
    throw new Error("Score record must be an object");
  }
  const record = payload as Record<string, unknown>;
  const fixtureId = numericField(record, "fixtureId", "FixtureId");
  const timestamp = numericField(record, "timestamp", "Timestamp", "ts", "Ts");
  const seq = numericField(record, "seq", "Seq");
  if (!fixtureId || !Number.isSafeInteger(fixtureId)) {
    throw new Error("Score record has no valid fixture ID");
  }
  if (timestamp === undefined) {
    throw new Error("Score record has no timestamp");
  }
  return {
    source,
    fixtureId,
    ...(seq === undefined ? {} : { seq }),
    timestamp,
    payload,
  };
}
