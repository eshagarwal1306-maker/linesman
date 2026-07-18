"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { SettlementAudit } from "@/lib/types";
import { formatLag } from "@/lib/format";
import { shortSignature } from "@/lib/solana/proofs";
import { VerifyOnChainButton } from "@/components/linesman/verify-onchain-button";
import { ShareButton } from "@/components/linesman/share-button";

type AuditWithLabel = SettlementAudit & { fixtureLabel?: string };

const VERDICT_STYLE: Record<SettlementAudit["verdict"], { label: string; color: string; glow?: string }> = {
  correct: { label: "✅ Correct", color: "var(--color-accent)" },
  late: { label: "⏱ Late", color: "var(--color-amber)", glow: "0 0 24px color-mix(in srgb, var(--color-amber) 30%, transparent)" },
  incorrect: { label: "⚠️ Incorrect", color: "var(--color-alert)", glow: "0 0 24px color-mix(in srgb, var(--color-alert) 35%, transparent)" },
  unresolved: { label: "… Unresolved", color: "var(--color-muted)" },
};

export function AuditRow({ audit }: { audit: AuditWithLabel }) {
  const [expanded, setExpanded] = useState(false);
  const style = VERDICT_STYLE[audit.verdict];
  const isScandal = audit.verdict === "incorrect" || audit.verdict === "late";

  return (
    <motion.div
      layout
      className="overflow-hidden rounded-xl border"
      style={{
        borderColor: isScandal ? style.color : "var(--color-border)",
        background: isScandal
          ? `color-mix(in srgb, ${style.color} 8%, var(--color-surface))`
          : "var(--color-surface)",
        boxShadow: style.glow,
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full min-h-11 items-start justify-between gap-3 p-3.5 text-left"
      >
        <div className="min-w-0">
          <p className="truncate text-xs uppercase tracking-wide text-[color:var(--color-muted)]">
            {audit.fixtureLabel ?? audit.fixtureId} · {audit.venue}
          </p>
          <p className="mt-0.5 text-sm font-medium leading-snug text-[color:var(--color-text)]">
            {audit.question}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-[color:var(--color-muted)]">
            <span>
              {audit.verdict === "unresolved"
                ? "Awaiting resolution"
                : `resolved ${formatLag(audit.lagMinutes)} after full time`}
            </span>
            <span className="font-mono">{shortSignature(audit.proofRef.txSignature)}</span>
          </div>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold"
          style={{ color: style.color, border: `1px solid ${style.color}` }}
        >
          {style.label}
        </span>
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 border-t border-[color:var(--color-border)] p-3.5">
          <dl className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="text-[color:var(--color-muted)]">TxLINE proved</dt>
              <dd className="font-mono text-[color:var(--color-text)]">{audit.provenResult}</dd>
            </div>
            <div>
              <dt className="text-[color:var(--color-muted)]">Venue resolved</dt>
              <dd className="font-mono" style={{ color: audit.verdict === "incorrect" ? style.color : "var(--color-text)" }}>
                {audit.venueResolution}
              </dd>
            </div>
          </dl>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <VerifyOnChainButton fixtureId={audit.fixtureId} proofRef={audit.proofRef} compact />
            </div>
            <ShareButton
              compact
              title="Linesman settlement audit"
              text={`${audit.question} — ${VERDICT_STYLE[audit.verdict].label}`}
              ogPath={`/api/og/audit/${encodeURIComponent(audit.venueMarketId)}`}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
