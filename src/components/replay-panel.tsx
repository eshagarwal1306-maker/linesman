"use client";

import { useEffect, useRef, useState } from "react";
import { useNetwork } from "@/components/app-providers";
import { ReplayController } from "@/lib/replay/controller";
import type { TxlineEvent } from "@/lib/txline/types";

export function ReplayPanel({
  fixtureId,
  onVerify,
}: {
  fixtureId: number | null;
  onVerify: (event: TxlineEvent) => void;
}) {
  const { network } = useNetwork();
  const [events, setEvents] = useState<TxlineEvent[]>([]);
  const [current, setCurrent] = useState<TxlineEvent>();
  const [index, setIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [status, setStatus] = useState<string>("Select a fixture.");
  const [loading, setLoading] = useState(false);
  const controller = useRef<ReplayController | undefined>(undefined);

  useEffect(() => {
    controller.current?.dispose();
    controller.current = undefined;
    setEvents([]);
    setCurrent(undefined);
    setIndex(0);
    if (!fixtureId) {
      setStatus("Select a fixture.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setStatus("Loading historical scores…");
    fetch(`/api/txline/history/${fixtureId}?network=${network}`)
      .then(async (response) => {
        const body: unknown = await response.json();
        if (!response.ok) {
          const message =
            body && typeof body === "object" && "error" in body
              ? String((body as { error: unknown }).error)
              : "History request failed";
          throw new Error(message);
        }
        return Array.isArray(body) ? (body as TxlineEvent[]) : [];
      })
      .then((records) => {
        if (cancelled) return;
        setEvents(records);
        setCurrent(undefined);
        setIndex(0);
        controller.current = new ReplayController(records, (event, nextIndex) => {
          setCurrent(event);
          setIndex(nextIndex);
        });
        setStatus(
          records.length
            ? `Loaded ${records.length} score updates.`
            : "No historical sequence for this fixture. TxLINE only returns fixtures that started between 2 weeks and 6 hours ago.",
        );
      })
      .catch((cause: Error) => {
        if (!cancelled) {
          setEvents([]);
          setStatus(cause.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      controller.current?.dispose();
    };
  }, [fixtureId, network]);

  function seek(next: number) {
    const clamped = Number.isFinite(next)
      ? Math.min(Math.max(0, next), Math.max(0, events.length - 1))
      : 0;
    setIndex(clamped);
    setCurrent(events[clamped]);
    controller.current?.seek(clamped);
  }

  const maxIndex = Math.max(0, events.length - 1);
  const sliderValue = Number.isFinite(index)
    ? Math.min(Math.max(0, index), maxIndex)
    : 0;
  const payload =
    current?.payload && typeof current.payload === "object"
      ? (current.payload as Record<string, unknown>)
      : undefined;

  return (
    <section className="feature-card" aria-labelledby="replay-title">
      <h2 id="replay-title">Historical replay</h2>
      <p className="fixture-hint">{loading ? "Loading…" : status}</p>
      {!fixtureId ? null : (
        <>
          <div className="replay-controls">
            <button
              disabled={events.length === 0}
              onClick={() => controller.current?.play()}
            >
              Play
            </button>
            <button onClick={() => controller.current?.pause()}>Pause</button>
            <label>
              Speed
              <select
                value={speed}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setSpeed(value);
                  controller.current?.setSpeed(value);
                }}
              >
                {[0.5, 1, 2, 5, 10].map((value) => (
                  <option value={value} key={value}>
                    {value}×
                  </option>
                ))}
              </select>
            </label>
            <input
              aria-label="Replay position"
              type="range"
              min={0}
              max={maxIndex}
              value={sliderValue}
              disabled={events.length === 0}
              onChange={(event) => seek(Number(event.target.value))}
            />
          </div>
          <p>
            Record {events.length ? sliderValue + 1 : 0} / {events.length}
          </p>
          {current && (
            <>
              <p>{new Date(current.timestamp).toISOString()}</p>
              <p>
                Game state:{" "}
                {String(payload?.gameState ?? payload?.GameState ?? "unknown")}
              </p>
              {current.seq !== undefined && (
                <button onClick={() => onVerify(current)}>Verify</button>
              )}
              <pre>{JSON.stringify(current.payload, null, 2)}</pre>
            </>
          )}
        </>
      )}
    </section>
  );
}
