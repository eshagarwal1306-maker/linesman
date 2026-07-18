"use client";

import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import type { GapPoint } from "@/lib/types";

export function GapSparkline({
  history,
  height = 40,
  positive,
}: {
  history: GapPoint[];
  height?: number;
  positive: boolean;
}) {
  if (history.length < 2) return null;
  const color = positive ? "var(--color-accent)" : "var(--color-alert)";
  const gradientId = `gap-gradient-${positive ? "pos" : "neg"}`;

  return (
    <div style={{ height, width: "100%" }} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={history} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Area
            type="monotone"
            dataKey="gapPct"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
