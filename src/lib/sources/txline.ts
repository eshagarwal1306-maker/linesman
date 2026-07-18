import "server-only";

import { getCredential } from "@/lib/txline/credentials";
import { txlineFetch } from "@/lib/txline/client";
import { fixturesFrom } from "@/lib/txline/fixtures";
import { decodeOddsMessage } from "@/lib/txline/odds-format";
import type { Network } from "@/lib/network/config";
import type { SharpLine, Team } from "@/lib/types";

/**
 * Real TxLINE sharp-line source. Only reachable once a wallet has completed
 * the /starter setup flow (guest -> subscribe -> activate) for the given
 * session + network — see `resolveLiveEligibility` in manager.ts. Every
 * failure here is caught by the caller and treated as "live unavailable",
 * never as a crash.
 */

export class LiveTxlineUnavailableError extends Error {}

function teamFromName(name: string | undefined, fallback: string): Team {
  const label = name?.trim() || fallback;
  return {
    code: label.slice(0, 3).toUpperCase(),
    name: label,
    primaryColor: "#3b6fd1",
    secondaryColor: "#c94b4b",
  };
}

function splitMatchup(label: string): { home?: string; away?: string } {
  const [matchup] = label.split(" · ");
  const [home, away] = (matchup ?? "").split(" vs ");
  return { home: home?.trim(), away: away?.trim() };
}

async function fetchJson(userId: string, network: Network, path: string): Promise<unknown> {
  const res = await txlineFetch(userId, network, path);
  if (!res.ok) throw new Error(`TxLINE request failed (${res.status}) for ${path}`);
  return res.json();
}

/**
 * Best-effort real sharp lines for whatever TxLINE is currently covering.
 * These are genuinely live match-odds for real fixtures — NOT the curated
 * World Cup Final/3rd-place story used by the mock/replay pipeline, since
 * TxLINE's real coverage is whatever football is actually being played.
 */
export async function getLiveSharpLines(userId: string, network: Network): Promise<SharpLine[]> {
  const credential = await getCredential(userId, network);
  if (!credential || credential.setupState !== "activated") {
    throw new LiveTxlineUnavailableError("TxLINE is not activated for this session/network");
  }

  const fixturesPayload = await fetchJson(userId, network, "/api/fixtures/snapshot");
  const allFixtures = fixturesFrom(fixturesPayload);
  const liveFixtures = allFixtures.filter((fixture) => (fixture.gameState ?? 0) > 0);
  const candidates = (liveFixtures.length > 0 ? liveFixtures : allFixtures).slice(0, 10);
  if (candidates.length === 0) {
    throw new LiveTxlineUnavailableError("TxLINE returned no fixtures");
  }

  const lines: SharpLine[] = [];
  await Promise.all(
    candidates.map(async (fixture) => {
      try {
        const oddsPayload = await fetchJson(userId, network, `/api/odds/snapshot/${fixture.id}`);
        const rawTicks = Array.isArray(oddsPayload) ? oddsPayload : [oddsPayload];
        const { home, away } = splitMatchup(fixture.label);
        const homeTeam = teamFromName(home, "Home");
        const awayTeam = teamFromName(away, "Away");

        for (const raw of rawTicks) {
          const tick = decodeOddsMessage(raw, { home, away });
          if (!tick || tick.marketType !== "1X2_PARTICIPANT_RESULT") continue;

          for (const selection of tick.selections) {
            if (selection.decimalOdds === null && selection.impliedPct === null) continue;
            const impliedProb =
              selection.impliedPct != null
                ? selection.impliedPct / 100
                : selection.decimalOdds
                  ? 1 / selection.decimalOdds
                  : null;
            if (impliedProb === null || !Number.isFinite(impliedProb) || impliedProb <= 0) continue;

            lines.push({
              outcomeId: `txl-${fixture.id}:1x2:${selection.key}`,
              fixtureId: `txl-${fixture.id}`,
              competition: fixture.competition,
              homeTeam,
              awayTeam,
              market: "1x2",
              selectionLabel: selection.label,
              decimalOdds: selection.decimalOdds ?? 1 / impliedProb,
              impliedProb,
              fairProb: impliedProb, // devig runs downstream in the manager, same as mock/replay
              packetTimestamp: tick.timestamp,
              proofRef: { network, epochDay: Math.floor(tick.timestamp / 86_400_000) },
              kickoffTime: fixture.startTime ?? tick.timestamp,
              isLive: tick.inRunning,
            });
          }
        }
      } catch {
        // One fixture's odds failing shouldn't drop the whole live snapshot.
      }
    }),
  );

  if (lines.length === 0) {
    throw new LiveTxlineUnavailableError("No decodable live odds right now");
  }
  return lines;
}
