"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { disagreementLabel } from "@/lib/engine/disagreement";

const RADIUS = 30;
const STROKE = 7;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ARC_FRACTION = 0.75; // 270° dial, gauge-style

function colorForScore(score: number): string {
  if (score >= 65) return "var(--color-alert)";
  if (score >= 35) return "var(--color-amber)";
  return "var(--color-accent)";
}

export function DisagreementDial({ score }: { score: number }) {
  const [expanded, setExpanded] = useState(false);
  const arcLength = CIRCUMFERENCE * ARC_FRACTION;
  const filled = (score / 100) * arcLength;
  const color = colorForScore(score);

  return (
    <button
      type="button"
      onClick={() => setExpanded((v) => !v)}
      className="flex w-full items-center gap-3 rounded-[22px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3.5 text-left shadow-[0_18px_36px_-26px_rgba(0,0,0,0.65)] transition-colors active:scale-[0.99] lg:p-4"
    >
      <svg
        width="64"
        height="64"
        viewBox="0 0 72 72"
        className="shrink-0 -rotate-[135deg]"
        aria-hidden="true"
      >
        <circle
          cx="36"
          cy="36"
          r={RADIUS}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${CIRCUMFERENCE}`}
        />
        <motion.circle
          cx="36"
          cy="36"
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${CIRCUMFERENCE}`}
          initial={{ strokeDashoffset: arcLength }}
          animate={{ strokeDashoffset: arcLength - filled }}
          transition={{ type: "spring", stiffness: 90, damping: 18 }}
        />
      </svg>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
          Disagreement Index
        </p>
        <p className="font-display text-2xl leading-none lg:text-3xl" style={{ color }}>
          {score}
        </p>
        {expanded ? (
          <p className="mt-1 text-xs leading-relaxed text-[color:var(--color-muted)]">
            {disagreementLabel(score)} Liquidity-weighted mean of |EV| across every edge on the board right now —
            tap to collapse.
          </p>
        ) : (
          <p className="mt-0.5 truncate text-xs text-[color:var(--color-muted)]">{disagreementLabel(score)}</p>
        )}
      </div>
    </button>
  );
}
