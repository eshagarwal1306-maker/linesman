"use client";

import { useEffect, useState } from "react";
import { useNetwork } from "@/components/app-providers";
import {
  fixturesFrom,
  isHistoricalReplayEligible,
  type FixtureSummary,
} from "@/lib/txline/fixtures";

const GAME_STATE_LABELS: Record<number, string> = {
  1: "Scheduled",
  5: "Finished",
  6: "Cancelled",
};

function formatStart(startTime: number | null): string {
  if (startTime === null) return "Start unknown";
  return new Date(startTime).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FixtureBrowser({
  active,
  onSelect,
}: {
  active: boolean;
  onSelect: (fixtureId: number | null) => void;
}) {
  const { network } = useNetwork();
  const [fixtures, setFixtures] = useState<FixtureSummary[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [snapshots, setSnapshots] = useState<unknown>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!active) {
      setFixtures([]);
      setSelected(null);
      setSnapshots(undefined);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    fetch(`/api/txline/fixtures?network=${network}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load fixtures");
        return response.json();
      })
      .then((value) => {
        if (cancelled) return;
        const nextFixtures = fixturesFrom(value);
        setFixtures(nextFixtures);
        if (nextFixtures[0]) {
          setSelected(nextFixtures[0].id);
          onSelect(nextFixtures[0].id);
          void loadSnapshots(nextFixtures[0].id);
        } else {
          setSelected(null);
          onSelect(null);
        }
      })
      .catch((cause: Error) => {
        if (!cancelled) setError(cause.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per activation/network
  }, [active, network]);

  async function loadSnapshots(fixtureId: number) {
    const [odds, scores] = await Promise.all([
      fetch(`/api/txline/odds/${fixtureId}?network=${network}`).then((r) =>
        r.json(),
      ),
      fetch(`/api/txline/scores/${fixtureId}?network=${network}`).then((r) =>
        r.json(),
      ),
    ]);
    setSnapshots({ odds, scores });
  }

  async function select(fixtureId: number) {
    setSelected(fixtureId);
    onSelect(fixtureId);
    setError(undefined);
    try {
      await loadSnapshots(fixtureId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Snapshot failed");
    }
  }

  const selectedFixture = fixtures.find((fixture) => fixture.id === selected);

  return (
    <section className="feature-card" aria-labelledby="fixtures-title">
      <h2 id="fixtures-title">Fixtures</h2>
      {!active ? (
        <p>Complete setup first.</p>
      ) : loading ? (
        <p>Loading fixtures…</p>
      ) : fixtures.length === 0 ? (
        <p>No fixtures returned for this network.</p>
      ) : (
        <ul className="fixture-list">
          {fixtures.map((fixture) => (
            <li key={fixture.id}>
              <button
                aria-pressed={selected === fixture.id}
                onClick={() => void select(fixture.id)}
              >
                <span className="fixture-name">{fixture.label}</span>
                <span className="fixture-meta">
                  {formatStart(fixture.startTime)}
                  {fixture.gameState != null
                    ? ` · ${GAME_STATE_LABELS[fixture.gameState] ?? `State ${fixture.gameState}`}`
                    : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {selectedFixture && (
        <p className="fixture-hint">
          {isHistoricalReplayEligible(selectedFixture.startTime)
            ? "This fixture is in the historical replay window."
            : "Replay needs a fixture that started between 2 weeks and 6 hours ago. Live streams can stay quiet until a covered match is in progress."}
        </p>
      )}
      {snapshots !== undefined && (
        <details>
          <summary>Snapshot payloads</summary>
          <pre>{JSON.stringify(snapshots, null, 2)}</pre>
        </details>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
