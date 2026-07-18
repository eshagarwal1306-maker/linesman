"use client";

import { useReplayStore } from "@/lib/store/replay-store";

export function ReplayBug() {
  const isReplayMode = useReplayStore((state) => state.isReplayMode);
  if (!isReplayMode) return null;

  return (
    <div className="pointer-events-none fixed right-3 top-3 z-50 flex items-center gap-1.5 rounded-full border border-[color:var(--color-alert)] bg-black/70 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[color:var(--color-alert)] backdrop-blur">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--color-alert)]" />
      Replay ●
    </div>
  );
}
