"use client";

import useSWR from "swr";
import { LayoutGroup } from "framer-motion";
import type { SettlementAudit } from "@/lib/types";
import type { WatchdogSummary } from "@/lib/engine/watchdog";
import { AuditRow } from "@/components/linesman/audit-row";
import { CountUp } from "@/components/linesman/count-up";
import { IconAlertTriangle, IconCheck } from "@/components/linesman/icons";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type AuditWithLabel = SettlementAudit & { fixtureLabel?: string };

export default function WatchdogPage() {
  const { data, isLoading } = useSWR<{ audits: AuditWithLabel[]; summary: WatchdogSummary; generatedAt: number }>(
    "/api/watchdog",
    fetcher,
    { refreshInterval: 30_000 },
  );

  const summary = data?.summary;

  return (
    <div className="flex flex-col gap-4 pt-1">
      <div>
        <p className="text-xs uppercase tracking-wide text-[color:var(--color-muted)]">Settlement Watchdog</p>
        <h1 className="font-display text-3xl leading-[0.95] text-[color:var(--color-text)] lg:text-5xl">
          Did the market get it right?
        </h1>
      </div>

      <div className="rounded-[22px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-[0_18px_36px_-26px_rgba(0,0,0,0.65)] lg:p-6">
        {summary ? (
          <p className="text-sm leading-relaxed text-[color:var(--color-text)] lg:text-base">
            <span className="font-display text-2xl lg:text-3xl" style={{ color: "var(--color-text)" }}>
              <CountUp value={summary.total} />
            </span>{" "}
            markets audited ·{" "}
            <span className="inline-flex items-center gap-1 font-semibold" style={{ color: "var(--color-accent)" }}>
              <CountUp value={summary.correct} /> correct <IconCheck className="h-3.5 w-3.5" />
            </span>{" "}
            ·{" "}
            <span className="font-semibold" style={{ color: "var(--color-amber)" }}>
              <CountUp value={summary.late} /> late
            </span>{" "}
            ·{" "}
            <span className="inline-flex items-center gap-1 font-semibold" style={{ color: "var(--color-alert)" }}>
              <CountUp value={summary.incorrect} /> incorrect <IconAlertTriangle className="h-3.5 w-3.5" />
            </span>
          </p>
        ) : (
          <div className="h-6 w-full animate-pulse rounded bg-[color:var(--color-border)]" />
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="h-[74px] animate-pulse rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]" />
          ))}
        </div>
      ) : (
        <LayoutGroup>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {data?.audits.map((audit) => (
              <AuditRow key={audit.venueMarketId} audit={audit} />
            ))}
          </div>
        </LayoutGroup>
      )}
    </div>
  );
}
