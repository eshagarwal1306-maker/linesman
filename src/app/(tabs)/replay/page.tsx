"use client";

import { useEffect } from "react";
import { MOCK_RECORDINGS, REPLAY_SPEEDS, useReplayStore } from "@/lib/store/replay-store";

const GOAL_MARKERS = [0.22, 0.47, 0.61, 0.88];

export default function ReplayPage() {
  const {
    isReplayMode,
    isPlaying,
    selectedRecordingId,
    speed,
    progress,
    setReplayMode,
    togglePlaying,
    setSpeed,
    setRecording,
    setProgress,
    advance,
  } = useReplayStore();

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => advance(1), 1_000);
    return () => clearInterval(interval);
  }, [isPlaying, advance]);

  const recording = MOCK_RECORDINGS.find((item) => item.id === selectedRecordingId) ?? MOCK_RECORDINGS[0];
  const speedIndex = REPLAY_SPEEDS.indexOf(speed);
  const elapsedMinutes = Math.round(progress * recording.durationMinutes);

  return (
    <div className="flex flex-col gap-5 pt-1">
      <div>
        <p className="text-xs uppercase tracking-wide text-[color:var(--color-muted)]">Replay / demo mode</p>
        <h1 className="font-display text-3xl leading-[0.95] text-[color:var(--color-text)] lg:text-5xl">
          Run the whole app off tape.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--color-muted)] lg:text-base">
          Every screen consumes the same recorded packet trail it would consume live — nothing here depends on a
          match actually happening right now.
        </p>
      </div>

      <label className="flex items-center justify-between rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
        <div>
          <p className="text-sm font-semibold text-[color:var(--color-text)]">Replay mode</p>
          <p className="text-xs text-[color:var(--color-muted)]">Toggle the Replay broadcast bug app-wide</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isReplayMode}
          onClick={() => setReplayMode(!isReplayMode)}
          className="relative h-7 w-12 rounded-full transition-colors"
          style={{ background: isReplayMode ? "var(--color-accent)" : "var(--color-border)" }}
        >
          <span
            className="absolute top-1 h-5 w-5 rounded-full bg-[color:var(--color-bg)] transition-transform"
            style={{ transform: isReplayMode ? "translateX(26px)" : "translateX(4px)" }}
          />
        </button>
      </label>

      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wide text-[color:var(--color-muted)]">Recording</p>
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        {MOCK_RECORDINGS.map((item) => {
          const active = item.id === selectedRecordingId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setRecording(item.id)}
              className="rounded-xl border p-3.5 text-left transition-all active:scale-[0.98]"
              style={{
                borderColor: active ? "var(--color-accent)" : "var(--color-border)",
                background: active
                  ? "color-mix(in srgb, var(--color-accent) 10%, var(--color-surface))"
                  : "var(--color-surface)",
              }}
            >
              <p className="text-sm font-semibold text-[color:var(--color-text)]">{item.label}</p>
              <p className="mt-0.5 text-xs text-[color:var(--color-muted)]">{item.description}</p>
              <p className="mt-1 text-xs text-[color:var(--color-muted)]">
                {item.eventCount} packets · {item.durationMinutes} min
              </p>
            </button>
          );
        })}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 lg:max-w-xl lg:mx-auto lg:w-full">
        <button
          type="button"
          onClick={togglePlaying}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="flex h-16 w-16 items-center justify-center rounded-full text-2xl text-[color:var(--color-bg)] transition-transform active:scale-90"
          style={{ background: "var(--color-accent)" }}
        >
          {isPlaying ? "❙❙" : "▶"}
        </button>

        <div className="w-full">
          <div className="flex items-center justify-between text-xs text-[color:var(--color-muted)]">
            <span>{elapsedMinutes}m</span>
            <span>{recording.durationMinutes}m</span>
          </div>
          <div className="relative mt-1 h-2 w-full rounded-full bg-[color:var(--color-border)]">
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ width: `${progress * 100}%`, background: "var(--color-accent)" }}
            />
            {GOAL_MARKERS.map((marker) => (
              <span
                key={marker}
                title="Goal event"
                className="absolute -top-1 h-4 w-1 rounded-full bg-[color:var(--color-amber)]"
                style={{ left: `${marker * 100}%` }}
              />
            ))}
            <input
              aria-label="Replay position"
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={progress}
              onChange={(event) => setProgress(Number(event.target.value))}
              className="absolute inset-0 h-4 w-full cursor-pointer opacity-0"
            />
          </div>
        </div>

        <div className="w-full">
          <p className="mb-1 text-center text-xs uppercase tracking-wide text-[color:var(--color-muted)]">
            Speed · {speed}×
          </p>
          <input
            aria-label="Replay speed"
            type="range"
            min={0}
            max={REPLAY_SPEEDS.length - 1}
            step={1}
            value={speedIndex}
            onChange={(event) => setSpeed(REPLAY_SPEEDS[Number(event.target.value)])}
            className="w-full accent-[color:var(--color-accent)]"
          />
          <div className="mt-1 flex justify-between text-[10px] text-[color:var(--color-muted)]">
            {REPLAY_SPEEDS.map((value) => (
              <span key={value}>{value}×</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
