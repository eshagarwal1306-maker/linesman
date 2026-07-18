"use client";

import { useState } from "react";
import useSWR from "swr";
import type { SourceStatus } from "@/lib/sources/manager";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function ShowcaseBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { data } = useSWR<{ status: SourceStatus }>("/api/status", fetcher, {
    refreshInterval: 15_000,
  });
  const status = data?.status;

  if (!status || status.mode === "live" || dismissed) return null;

  const isReplay = status.mode === "replay";
  const message = isReplay
    ? "▶ Replaying real TxLINE data from the World Cup Final weekend"
    : "▶ Showcase mode — seeded demo data. Connect a wallet on /starter for live odds.";

  return (
    <div
      className="flex items-center justify-between gap-3 border-b border-[color:var(--color-border)] px-4 py-1.5 text-xs"
      style={{
        background: isReplay ? "color-mix(in srgb, var(--color-amber) 12%, var(--color-surface))" : "var(--color-surface)",
        color: isReplay ? "var(--color-amber)" : "var(--color-muted)",
      }}
    >
      <span className="truncate">{message}</span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="-m-2.5 shrink-0 rounded-full p-2.5 opacity-70 transition-opacity hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}
