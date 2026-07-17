"use client";

import { useEffect, useState } from "react";
import { useNetwork } from "@/components/app-providers";

type Fixture = {
  id: number;
  label: string;
  raw: unknown;
};

function fixturesFrom(value: unknown): Fixture[] {
  const list = Array.isArray(value)
    ? value
    : value && typeof value === "object" && "fixtures" in value
      ? (value as { fixtures: unknown }).fixtures
      : [];
  if (!Array.isArray(list)) return [];
  return list.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const id = record.fixtureId ?? record.FixtureId ?? record.id;
    if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) return [];
    const home = record.homeTeam ?? record.HomeTeam ?? record.home;
    const away = record.awayTeam ?? record.AwayTeam ?? record.away;
    const label =
      typeof record.name === "string"
        ? record.name
        : `${String(home ?? "Home")} vs ${String(away ?? "Away")}`;
    return [{ id, label, raw: item }];
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
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [snapshots, setSnapshots] = useState<unknown>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!active) return;
    fetch(`/api/txline/fixtures?network=${network}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load fixtures");
        return response.json();
      })
      .then((value) => {
        const nextFixtures = fixturesFrom(value);
        setFixtures(nextFixtures);
        if (nextFixtures[0]) {
          setSelected(nextFixtures[0].id);
          onSelect(nextFixtures[0].id);
        }
      })
      .catch((cause) => setError(cause.message));
  }, [active, network, onSelect]);

  async function select(fixtureId: number) {
    setSelected(fixtureId);
    onSelect(fixtureId);
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

  return (
    <section className="feature-card" aria-labelledby="fixtures-title">
      <h2 id="fixtures-title">Fixtures</h2>
      {!active ? <p>Complete setup first.</p> : fixtures.length === 0 ? (
        <p>No fixtures returned.</p>
      ) : (
        <ul className="fixture-list">
          {fixtures.map((fixture) => (
            <li key={fixture.id}>
              <button
                aria-pressed={selected === fixture.id}
                onClick={() => select(fixture.id)}
              >
                {fixture.label}
              </button>
            </li>
          ))}
        </ul>
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
