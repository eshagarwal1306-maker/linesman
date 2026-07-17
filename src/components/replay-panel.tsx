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
  const controller = useRef<ReplayController | undefined>(undefined);

  useEffect(() => {
    controller.current?.dispose();
    if (!fixtureId) return;
    fetch(`/api/txline/history/${fixtureId}?network=${network}`)
      .then((response) => response.json())
      .then((records: TxlineEvent[]) => {
        setEvents(records);
        setCurrent(undefined);
        setIndex(0);
        controller.current = new ReplayController(records, (event, nextIndex) => {
          setCurrent(event);
          setIndex(nextIndex);
        });
      })
      .catch(() => setEvents([]));
    return () => controller.current?.dispose();
  }, [fixtureId, network]);

  function seek(next: number) {
    setIndex(next);
    setCurrent(events[next]);
    controller.current?.seek(next);
  }

  const payload =
    current?.payload && typeof current.payload === "object"
      ? (current.payload as Record<string, unknown>)
      : undefined;
  return (
    <section className="feature-card" aria-labelledby="replay-title">
      <h2 id="replay-title">Historical replay</h2>
      {!fixtureId ? <p>Select a completed fixture.</p> : (
        <>
          <div className="replay-controls">
            <button onClick={() => controller.current?.play()}>Play</button>
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
                  <option value={value} key={value}>{value}×</option>
                ))}
              </select>
            </label>
            <input
              aria-label="Replay position"
              type="range"
              min={0}
              max={Math.max(0, events.length - 1)}
              value={Math.min(index, Math.max(0, events.length - 1))}
              onChange={(event) => seek(Number(event.target.value))}
            />
          </div>
          <p>Record {events.length ? index + 1 : 0} / {events.length}</p>
          {current && (
            <>
              <p>{new Date(current.timestamp).toISOString()}</p>
              <p>Game state: {String(payload?.gameState ?? payload?.GameState ?? "unknown")}</p>
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
