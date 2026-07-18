"use client";

import { useEffect, useState } from "react";
import { formatRelativeTime } from "@/lib/format";
import type { SourceMode } from "@/lib/sources/manager";

const MODE_STYLE: Record<SourceMode, { label: string; color: string; pulse: boolean }> = {
  live: { label: "LIVE · TxLINE", color: "var(--color-accent)", pulse: true },
  replay: { label: "REPLAY · recorded TxLINE", color: "var(--color-amber)", pulse: true },
  mock: { label: "DEMO DATA", color: "var(--color-muted)", pulse: false },
};

export function FreshnessChip({
  lastPacketAt,
  mode = "mock",
  onTap,
}: {
  lastPacketAt: number;
  mode?: SourceMode;
  onTap?: () => void;
}) {
  const [, forceTick] = useState(0);
  const style = MODE_STYLE[mode];

  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 1_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <button
      type="button"
      onClick={onTap}
      className="flex min-h-11 items-center gap-1.5 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-xs text-[color:var(--color-muted)] transition-colors active:scale-95 hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-text)]"
      title="How mode is determined: real TxLINE session > recorded replay > seeded demo data. Never faked."
    >
      <span className="relative flex h-2 w-2">
        {style.pulse && (
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
            style={{ background: style.color }}
          />
        )}
        <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: style.color }} />
      </span>
      <span className="font-semibold tracking-wide" style={{ color: style.color }}>
        {style.label}
      </span>
      <span className="text-[color:var(--color-muted)]">· {formatRelativeTime(lastPacketAt)}</span>
    </button>
  );
}
