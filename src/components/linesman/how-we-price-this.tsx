import type { SharpLine } from "@/lib/types";

export function HowWePriceThis({ bookSelections }: { bookSelections: SharpLine[] }) {
  return (
    <details className="group rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
      <summary className="-m-4 flex min-h-11 cursor-pointer list-none items-center p-4 text-sm font-semibold text-[color:var(--color-text)]">
        How we price this
        <span className="ml-auto text-[color:var(--color-muted)] transition-transform group-open:rotate-180">
          ⌄
        </span>
      </summary>
      <p className="mt-3 text-sm leading-relaxed text-[color:var(--color-muted)]">
        Every selection in this market carries a small bookmaker margin, so raw implied probabilities add up to
        more than 100%. We strip that margin out with a power de-vig — solving for one exponent that pulls every
        selection back to a book that sums to exactly 100% — to get TxLINE&rsquo;s <em>fair</em> probability.
      </p>
      <div className="mt-3 overflow-hidden rounded-lg border border-[color:var(--color-border)]">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[color:var(--color-bg)] text-left text-[color:var(--color-muted)]">
              <th className="px-2.5 py-2 font-medium">Selection</th>
              <th className="px-2.5 py-2 font-medium">Odds</th>
              <th className="px-2.5 py-2 font-medium">Raw</th>
              <th className="px-2.5 py-2 font-medium">Fair</th>
            </tr>
          </thead>
          <tbody>
            {bookSelections.map((selection) => (
              <tr key={selection.outcomeId} className="border-t border-[color:var(--color-border)]">
                <td className="px-2.5 py-2 text-[color:var(--color-text)]">{selection.selectionLabel}</td>
                <td className="px-2.5 py-2 font-mono text-[color:var(--color-text)]">
                  {selection.decimalOdds.toFixed(2)}
                </td>
                <td className="px-2.5 py-2 font-mono text-[color:var(--color-muted)]">
                  {(selection.impliedProb * 100).toFixed(1)}%
                </td>
                <td className="px-2.5 py-2 font-mono" style={{ color: "var(--color-accent)" }}>
                  {(selection.fairProb * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
