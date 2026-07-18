import "server-only";

import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { recordings } from "@/db/schema";
import { decodeOddsMessage } from "@/lib/txline/odds-format";
import type { SharpLine } from "@/lib/types";

/**
 * Replay engine. Reads RAW packets recorded verbatim by `lib/sources/recorder.ts`
 * and decodes them on read — zero transformation happens at record time.
 *
 * Until `pnpm record` has actually captured a live session (requires an
 * activated TxLINE credential — see docs/ONCHAIN.md / FRICTION.md), the
 * `recordings` table has zero rows for every recording id, so every function
 * here degrades to "no recording" and the source manager falls back to mock.
 * That fallback is the whole point: this file is safe to ship inert.
 */

export const SHOWCASE_RECORDING_ID = process.env.SHOWCASE_RECORDING_ID ?? "wc26-final";
export const SHOWCASE_SPEED = Number(process.env.SHOWCASE_SPEED ?? 30);

/** Stateless wall-clock position inside a looping recording — no timers, no memory, safe on serverless. */
const CLOCK_EPOCH_MS = 1_800_000_000_000;

export function replayClockFraction(durationMinutes: number, speed = SHOWCASE_SPEED): number {
  const durationMs = Math.max(durationMinutes, 1) * 60_000;
  const elapsedMs = (Date.now() - CLOCK_EPOCH_MS) * speed;
  const position = ((elapsedMs % durationMs) + durationMs) % durationMs;
  return position / durationMs;
}

export async function getRecordingPacketCount(recordingId: string): Promise<number> {
  try {
    const rows = await getDb()
      .select({ count: sql<number>`count(*)` })
      .from(recordings)
      .where(sql`${recordings.recordingId} = ${recordingId}`)
      .limit(1);
    return Number(rows[0]?.count ?? 0);
  } catch {
    return 0;
  }
}

/**
 * Decode every raw packet for a recording, in order, into the latest known
 * SharpLine per outcome as of `fraction` through the recording's duration.
 * Returns null if the recording has no rows (caller should fall back).
 */
export async function getReplaySharpLines(
  recordingId: string,
  fraction: number,
): Promise<SharpLine[] | null> {
  try {
    const rows = await getDb()
      .select({ ts: recordings.ts, raw: recordings.raw })
      .from(recordings)
      .where(sql`${recordings.recordingId} = ${recordingId}`)
      .orderBy(recordings.ts);
    if (rows.length === 0) return null;

    const firstTs = rows[0].ts.getTime();
    const lastTs = rows[rows.length - 1].ts.getTime();
    const cutoff = firstTs + Math.max(0, Math.min(1, fraction)) * (lastTs - firstTs);

    const latestByOutcome = new Map<string, SharpLine>();
    for (const row of rows) {
      if (row.ts.getTime() > cutoff) break;
      const tick = decodeOddsMessage(row.raw);
      if (!tick) continue;
      for (const selection of tick.selections) {
        if (selection.impliedPct === null) continue;
        const outcomeId = `txl-${tick.fixtureId}:1x2:${selection.key}`;
        latestByOutcome.set(outcomeId, {
          outcomeId,
          fixtureId: `txl-${tick.fixtureId}`,
          competition: "TxLINE",
          homeTeam: { code: "H", name: "Home", primaryColor: "#3b6fd1", secondaryColor: "#c94b4b" },
          awayTeam: { code: "A", name: "Away", primaryColor: "#3b6fd1", secondaryColor: "#c94b4b" },
          market: "1x2",
          selectionLabel: selection.label,
          decimalOdds: selection.decimalOdds ?? 0,
          impliedProb: selection.impliedPct / 100,
          fairProb: selection.impliedPct / 100,
          packetTimestamp: tick.timestamp,
          proofRef: { epochDay: Math.floor(tick.timestamp / 86_400_000) },
          kickoffTime: tick.timestamp,
          isLive: tick.inRunning,
        });
      }
    }
    return [...latestByOutcome.values()];
  } catch {
    return null;
  }
}
