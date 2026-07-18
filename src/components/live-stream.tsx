"use client";

import { useEffect, useRef, useState } from "react";
import { useNetwork } from "@/components/app-providers";
import { SseStreamDecoder, type SseMessage } from "@/lib/txline/sse";
import { normalizeScoreEvent, type TxlineEvent } from "@/lib/txline/types";

type StreamState =
  | "connecting"
  | "live"
  | "idle"
  | "reconnecting"
  | "failed";

const STATUS_LABEL: Record<StreamState, string> = {
  connecting: "Opening stream…",
  live: "Connected — receiving updates",
  idle: "Connected — waiting for match events",
  reconnecting: "Reconnecting…",
  failed: "Stream failed",
};

function isHeartbeat(data: string): boolean {
  try {
    const parsed = JSON.parse(data) as Record<string, unknown>;
    const keys = Object.keys(parsed);
    return keys.length === 1 && (keys[0] === "Ts" || keys[0] === "ts");
  } catch {
    return false;
  }
}

function StreamPanel({
  kind,
  fixtureId,
  onVerify,
}: {
  kind: "odds" | "scores";
  fixtureId: number | null;
  onVerify: (event: TxlineEvent) => void;
}) {
  const { network } = useNetwork();
  const [status, setStatus] = useState<StreamState>("connecting");
  const [events, setEvents] = useState<SseMessage[]>([]);
  const [heartbeatAt, setHeartbeatAt] = useState<number>();
  const lastId = useRef<string | undefined>(undefined);

  useEffect(() => {
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
          `/api/txline/stream/${kind}?network=${network}`,
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
        const consumeMessages = (messages: SseMessage[]) => {
          for (const message of messages) {
            if (message.id) lastId.current = message.id;
            if (isHeartbeat(message.data)) {
              setHeartbeatAt(Date.now());
              setStatus((current) =>
                current === "failed" || current === "connecting"
                  ? current
                  : "idle",
              );
              markIdleLater();
              continue;
            }
            setStatus("live");
            markIdleLater();
            setEvents((current) => [...current, message].slice(-250));
          }
        };
        while (!controller.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) {
            consumeMessages(parser.finish());
            break;
          }
          consumeMessages(parser.push(value));
        }
        if (!controller.signal.aborted) throw new Error("Stream ended");
      } catch {
        if (controller.signal.aborted) return;
        reconnectAttempt += 1;
        const delays = [1, 2, 4, 8, 15];
        const seconds = delays[Math.min(reconnectAttempt - 1, delays.length - 1)];
        setStatus(reconnectAttempt > 12 ? "failed" : "reconnecting");
        if (reconnectAttempt <= 12) {
          reconnectTimer = setTimeout(
            connect,
            seconds * 1_000 * (0.8 + Math.random() * 0.4),
          );
        }
      }
    };
    void connect();
    return () => {
      controller.abort();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (idleTimer) clearTimeout(idleTimer);
    };
    // Streams are network-wide; do not reconnect when the selected fixture changes.
  }, [kind, network]);

  const recent = events.slice(-12);

  return (
    <article className="stream-panel">
      <h3>{kind === "scores" ? "Live scores" : "Live odds"}</h3>
      <p className={`stream-state stream-${status}`}>{STATUS_LABEL[status]}</p>
      <p className="stream-help">
        {status === "idle" || status === "live"
          ? "An open stream means credentials work. Match events only appear while a covered fixture is live."
          : status === "connecting" || status === "reconnecting"
            ? "Holding an SSE connection to TxLINE…"
            : "Could not keep the stream open after several retries."}
      </p>
      {heartbeatAt && (
        <p className="stream-heartbeat">
          Last heartbeat {new Date(heartbeatAt).toLocaleTimeString()}
        </p>
      )}
      {recent.length === 0 ? (
        <p className="stream-empty">No match payloads yet.</p>
      ) : (
        <ol>
          {recent.map((event, index) => {
            let normalized: TxlineEvent | undefined;
            if (kind === "scores") {
              try {
                normalized = normalizeScoreEvent(JSON.parse(event.data), "live");
              } catch {
                normalized = undefined;
              }
            }
            const matchesFixture =
              normalized !== undefined &&
              (fixtureId === null || normalized.fixtureId === fixtureId);
            return (
              <li key={`${event.id ?? "event"}-${index}`}>
                <code>{event.data}</code>
                {matchesFixture && normalized?.seq !== undefined && (
                  <button onClick={() => onVerify(normalized)}>Verify</button>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </article>
  );
}

export function LiveStream({
  fixtureId,
  onVerify,
}: {
  fixtureId: number | null;
  onVerify: (event: TxlineEvent) => void;
}) {
  return (
    <section className="feature-card">
      <h2>Live streams</h2>
      <p className="stream-help">
        Odds and scores streams are network-wide. Select a fixture to highlight
        matching score events for proof validation.
      </p>
      <div className="stream-grid">
        <StreamPanel kind="odds" fixtureId={fixtureId} onVerify={onVerify} />
        <StreamPanel kind="scores" fixtureId={fixtureId} onVerify={onVerify} />
      </div>
    </section>
  );
}
