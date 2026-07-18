export function LiveTickerStrip({ items }: { items: string[] }) {
  const loop = [...items, ...items];
  return (
    <div className="sticky top-0 z-30 overflow-hidden border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
      <div className="ln-ticker-track flex w-max gap-10 whitespace-nowrap px-4 py-1.5 text-[11px] font-medium uppercase tracking-wide text-[color:var(--color-muted)]">
        {loop.map((item, index) => (
          <span key={index} className="flex items-center gap-2">
            <span className="text-[color:var(--color-accent)]">●</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
