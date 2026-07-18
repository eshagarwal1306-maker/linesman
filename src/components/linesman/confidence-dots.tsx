import type { Confidence } from "@/lib/types";

const LEVEL: Record<Confidence, number> = { low: 1, medium: 2, high: 3 };
const LABEL: Record<Confidence, string> = {
  low: "Low confidence",
  medium: "Medium confidence",
  high: "High confidence",
};

export function ConfidenceDots({ confidence }: { confidence: Confidence }) {
  const filled = LEVEL[confidence];
  return (
    <div className="flex items-center gap-2" title={LABEL[confidence]} aria-label={LABEL[confidence]}>
      <div className="flex gap-[3px]">
        {[1, 2, 3].map((dot) => (
          <span
            key={dot}
            className="block h-[6px] w-[6px] rounded-full transition-colors"
            style={{
              background: dot <= filled ? "var(--color-accent)" : "var(--color-border)",
            }}
          />
        ))}
      </div>
      <span className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-muted)]">
        {confidence}
      </span>
    </div>
  );
}
