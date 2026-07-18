export type FeedFilter = "all" | "final" | "underpriced" | "high_confidence";

const FILTERS: { id: FeedFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "final", label: "Final" },
  { id: "underpriced", label: "Underpriced" },
  { id: "high_confidence", label: "High confidence" },
];

export function FilterChips({
  active,
  onChange,
}: {
  active: FeedFilter;
  onChange: (filter: FeedFilter) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Feed filters">
      {FILTERS.map((filter) => {
        const isActive = filter.id === active;
        return (
          <button
            key={filter.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(filter.id)}
            className="flex min-h-11 shrink-0 items-center rounded-full border px-3.5 text-xs font-medium transition-all active:scale-95"
            style={{
              borderColor: isActive ? "var(--color-accent)" : "var(--color-border)",
              background: isActive ? "color-mix(in srgb, var(--color-accent) 14%, transparent)" : "transparent",
              color: isActive ? "var(--color-accent)" : "var(--color-muted)",
            }}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}
