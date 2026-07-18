"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useNetwork } from "@/components/app-providers";
import { ReplayPanel } from "@/components/replay-panel";
import { ValidationPanel } from "@/components/validation-panel";
import {
  fixturesFrom,
  isHistoricalReplayEligible,
  type FixtureSummary,
} from "@/lib/txline/fixtures";
import {
  decodeOddsMessage,
  formatDecimalOdds,
  formatPct,
  marketKey,
  type OddsTick,
} from "@/lib/txline/odds-format";
import { SseStreamDecoder, type SseMessage } from "@/lib/txline/sse";
import type { TxlineEvent } from "@/lib/txline/types";

type StreamState = "connecting" | "live" | "idle" | "reconnecting" | "failed";

const STATUS_LABEL: Record<StreamState, string> = {
  connecting: "Opening stream…",
  live: "Live updates",
  idle: "Listening",
  reconnecting: "Reconnecting…",
  failed: "Disconnected",
};

function formatKickoff(startTime: number | null): string {
  if (startTime === null) return "Kickoff unknown";
  return new Date(startTime).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function teamsFromFixture(fixture?: FixtureSummary) {
  if (!fixture) return undefined;
  const home =
    typeof fixture.raw.Participant1 === "string"
      ? fixture.raw.Participant1
      : undefined;
  const away =
    typeof fixture.raw.Participant2 === "string"
      ? fixture.raw.Participant2
      : undefined;
  return { home, away };
}

function useOddsStream(network: "devnet" | "mainnet", enabled: boolean) {
  const [status, setStatus] = useState<StreamState>("connecting");
  const [ticks, setTicks] = useState<OddsTick[]>([]);
  const [heartbeatAt, setHeartbeatAt] = useState<number>();
  const lastId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let reconnectAttempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;

    const markIdleLater = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => setStatus("idle"), 12_000);
    };

    const connect = async () => {
      setStatus(reconnectAttempt ? "reconnecting" : "connecting");
      try {
        const headers: HeadersInit = { Accept: "text/event-stream" };
        if (lastId.current) headers["Last-Event-ID"] = lastId.current;
        const response = await fetch(
          `/api/txline/stream/odds?network=${network}`,
          { headers, signal: controller.signal, cache: "no-store" },
        );
        if (!response.ok || !response.body) {
          throw new Error(`Stream unavailable (${response.status})`);
        }
        setStatus("live");
        reconnectAttempt = 0;
        markIdleLater();
        const reader = response.body.getReader();
        const parser = new SseStreamDecoder();
        const consume = (messages: SseMessage[]) => {
          for (const message of messages) {
            if (message.id) lastId.current = message.id;
            let payload: unknown;
            try {
              payload = JSON.parse(message.data);
            } catch {
              continue;
            }
            const record =
              payload && typeof payload === "object"
                ? (payload as Record<string, unknown>)
                : null;
            if (record && Object.keys(record).length === 1 && ("Ts" in record || "ts" in record)) {
              setHeartbeatAt(Date.now());
              setStatus("idle");
              markIdleLater();
              continue;
            }
            const tick = decodeOddsMessage(payload);
            if (!tick) continue;
            setStatus("live");
            markIdleLater();
            setTicks((current) => {
              const next = [...current.filter((item) => marketKey(item) !== marketKey(tick) || item.fixtureId !== tick.fixtureId), tick];
              // Keep latest markets, newest first by timestamp.
              return next
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 80);
            });
          }
        };
        while (!controller.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) {
            consume(parser.finish());
            break;
          }
          consume(parser.push(value));
        }
        if (!controller.signal.aborted) throw new Error("Stream ended");
      } catch {
        if (controller.signal.aborted) return;
        reconnectAttempt += 1;
        setStatus(reconnectAttempt > 12 ? "failed" : "reconnecting");
        if (reconnectAttempt <= 12) {
          const delays = [1, 2, 4, 8, 15];
          const seconds = delays[Math.min(reconnectAttempt - 1, delays.length - 1)];
          reconnectTimer = setTimeout(connect, seconds * 1_000);
        }
      }
    };
    void connect();
    return () => {
      controller.abort();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, [enabled, network]);

  return { status, ticks, heartbeatAt };
}

function MarketCard({
  tick,
  teams,
}: {
  tick: OddsTick;
  teams?: { home?: string; away?: string };
}) {
  const labeled = decodeOddsMessage(tick.raw, teams) ?? tick;
  return (
    <article className="market-card">
      <header>
        <h4>{labeled.marketLabel}</h4>
        <p>
          {labeled.period}
          {labeled.line && !labeled.marketType.includes("OVERUNDER")
            ? ` · line ${labeled.line}`
            : ""}
          {labeled.inRunning ? " · in-play" : " · pre-match"}
        </p>
      </header>
      <div className="selection-row">
        {labeled.selections.map((selection) => (
          <div className="selection" key={selection.key}>
            <span className="selection-name">{selection.label}</span>
            <strong className="selection-odds">
              {formatDecimalOdds(selection.decimalOdds)}
            </strong>
            <span className="selection-pct">
              {formatPct(selection.impliedPct)}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}

export function MatchWorkspace({ active }: { active: boolean }) {
  const { network } = useNetwork();
  const [fixtures, setFixtures] = useState<FixtureSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loadingFixtures, setLoadingFixtures] = useState(false);
  const [error, setError] = useState<string>();
  const [validationEvent, setValidationEvent] = useState<TxlineEvent>();
  const { status, ticks, heartbeatAt } = useOddsStream(network, active);

  useEffect(() => {
    if (!active) {
      setFixtures([]);
      setSelectedId(null);
      return;
    }
    let cancelled = false;
    setLoadingFixtures(true);
    fetch(`/api/txline/fixtures?network=${network}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load fixtures");
        return response.json();
      })
      .then((value) => {
        if (cancelled) return;
        const next = fixturesFrom(value);
        setFixtures(next);
        setSelectedId((current) => current ?? next[0]?.id ?? null);
      })
      .catch((cause: Error) => {
        if (!cancelled) setError(cause.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingFixtures(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active, network]);

  const activeFixtureIds = useMemo(() => {
    const ids = new Set(ticks.map((tick) => tick.fixtureId));
    return [...ids];
  }, [ticks]);

  const catalog = useMemo(() => {
    const byId = new Map(fixtures.map((fixture) => [fixture.id, fixture]));
    for (const id of activeFixtureIds) {
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        label: `Live markets · Fixture ${id}`,
        competition: "From odds stream",
        startTime: null,
        gameState: null,
        raw: { FixtureId: id },
      });
    }
    return [...byId.values()];
  }, [activeFixtureIds, fixtures]);

  const selected = catalog.find((fixture) => fixture.id === selectedId);
  const teams = teamsFromFixture(selected);
  const selectedTicks = useMemo(() => {
    const relevant = ticks.filter((tick) =>
      selectedId ? tick.fixtureId === selectedId : true,
    );
    const latestByMarket = new Map<string, OddsTick>();
    for (const tick of relevant) {
      const key = `${tick.fixtureId}|${marketKey(tick)}`;
      const existing = latestByMarket.get(key);
      if (!existing || tick.timestamp >= existing.timestamp) {
        latestByMarket.set(key, tick);
      }
    }
    return [...latestByMarket.values()].sort((a, b) =>
      a.marketLabel.localeCompare(b.marketLabel),
    );
  }, [selectedId, ticks]);

  function handleVerify(event: TxlineEvent) {
    setValidationEvent(event);
  }

  if (!active) {
    return (
      <section className="feature-card match-workspace">
        <h2>Match board</h2>
        <p className="fixture-hint">Activate TxLINE to load fixtures and live markets.</p>
      </section>
    );
  }

  return (
    <section className="match-workspace" aria-labelledby="match-board-title">
      <div className="section-heading">
        <p>Live board</p>
        <h2 id="match-board-title">Markets, not raw packets.</h2>
      </div>

      <div className="match-layout">
        <aside className="feature-card fixture-rail">
          <h3>Fixtures</h3>
          {loadingFixtures ? (
            <p className="fixture-hint">Loading…</p>
          ) : catalog.length === 0 ? (
            <p className="fixture-hint">No fixtures returned.</p>
          ) : (
            <ul className="fixture-list">
              {catalog.map((fixture) => {
                const hot = activeFixtureIds.includes(fixture.id);
                return (
                  <li key={fixture.id}>
                    <button
                      aria-pressed={selectedId === fixture.id}
                      onClick={() => setSelectedId(fixture.id)}
                    >
                      <span className="fixture-name">
                        {typeof fixture.raw.Participant1 === "string" &&
                        typeof fixture.raw.Participant2 === "string"
                          ? `${fixture.raw.Participant1} vs ${fixture.raw.Participant2}`
                          : fixture.label}
                      </span>
                      <span className="fixture-meta">
                        {fixture.competition}
                        {fixture.startTime !== null
                          ? ` · ${formatKickoff(fixture.startTime)}`
                          : ""}
                        {hot ? " · odds moving" : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {error && <p role="alert">{error}</p>}
        </aside>

        <div className="match-main">
          <article className="feature-card match-hero-card">
            {selected ? (
              <>
                <p className="eyebrow">{selected.competition}</p>
                <h3>
                  {typeof selected.raw.Participant1 === "string"
                    ? selected.raw.Participant1
                    : "Team 1"}
                  <span> vs </span>
                  {typeof selected.raw.Participant2 === "string"
                    ? selected.raw.Participant2
                    : "Team 2"}
                </h3>
                <p className="fixture-hint">
                  Kickoff {formatKickoff(selected.startTime)} · Fixture #
                  {selected.id}
                </p>
                <p className={`stream-state stream-${status}`}>
                  Odds feed: {STATUS_LABEL[status]}
                  {heartbeatAt
                    ? ` · heartbeat ${new Date(heartbeatAt).toLocaleTimeString()}`
                    : ""}
                </p>
                <p className="fixture-hint">
                  {isHistoricalReplayEligible(selected.startTime)
                    ? "This match is inside the historical replay window."
                    : "Historical replay needs a match that kicked off between 2 weeks and 6 hours ago. These listed fixtures are still upcoming, so replay stays empty until then."}
                </p>
              </>
            ) : (
              <p className="fixture-hint">Select a fixture from the list.</p>
            )}
          </article>

          <article className="feature-card">
            <div className="board-header">
              <h3>StablePrice markets</h3>
              <p className="fixture-hint">
                Prices are decimal odds (feed value ÷ 1000). Percentages are
                demarginized implied probabilities from TxLINE StablePrice.
              </p>
            </div>
            {selectedTicks.length === 0 ? (
              <p className="fixture-hint">
                No markets for this fixture in the current stream window yet.
                {activeFixtureIds.length
                  ? ` Odds are currently moving on fixture(s) ${activeFixtureIds.join(", ")}.`
                  : " Waiting for the next StablePrice batch."}
              </p>
            ) : (
              <div className="market-grid">
                {selectedTicks.map((tick) => (
                  <MarketCard
                    key={`${tick.fixtureId}-${marketKey(tick)}`}
                    tick={tick}
                    teams={teams}
                  />
                ))}
              </div>
            )}
            <details className="raw-details">
              <summary>What the numbers mean</summary>
              <ul className="legend-list">
                <li>
                  <strong>2.77</strong> decimal odds means a 1 unit stake returns
                  2.77 total if that selection wins.
                </li>
                <li>
                  <strong>36.1%</strong> is TxLINE’s demarginized implied
                  probability for that selection.
                </li>
                <li>
                  <strong>Asian handicap / Over-under lines</strong> come from
                  `MarketParameters` (for example line=-0.5 or line=2.75).
                </li>
                <li>
                  Streams can be healthy with only heartbeats when no covered
                  match is producing score events.
                </li>
              </ul>
            </details>
          </article>

          <div className="match-secondary">
            <ReplayPanel fixtureId={selectedId} onVerify={handleVerify} />
            <ValidationPanel event={validationEvent} />
          </div>
        </div>
      </div>
    </section>
  );
}
