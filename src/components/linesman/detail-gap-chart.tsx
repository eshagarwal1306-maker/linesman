"use client";

import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GapPoint } from "@/lib/types";

export function DetailGapChart({ history, kickoffTime }: { history: GapPoint[]; kickoffTime?: number | null }) {
  if (history.length < 2) return null;
  const latest = history[history.length - 1].gapPct;
  const color = latest >= 0 ? "var(--color-accent)" : "var(--color-alert)";
  const showKickoff =
    kickoffTime != null && kickoffTime >= history[0].t && kickoffTime <= history[history.length - 1].t;

  return (
    <div style={{ height: 140, width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={history} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="detail-gap-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="t"
            tickFormatter={(t: number) => new Date(t).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
            stroke="var(--color-border)"
            tick={{ fill: "var(--color-muted)", fontSize: 10 }}
            minTickGap={40}
          />
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Tooltip
            contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
            labelFormatter={(label) => new Date(Number(label)).toLocaleTimeString()}
            formatter={(value) => [`${Number(value).toFixed(1)}%`, "Gap"]}
          />
          {showKickoff && (
            <ReferenceLine x={kickoffTime} stroke="var(--color-muted)" strokeDasharray="4 4" label={{ value: "Kickoff", position: "insideTopLeft", fill: "var(--color-muted)", fontSize: 10 }} />
          )}
          <Area type="monotone" dataKey="gapPct" stroke={color} strokeWidth={2} fill="url(#detail-gap-gradient)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
