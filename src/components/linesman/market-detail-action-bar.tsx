"use client";

import type { ProofRef, VenuePrice } from "@/lib/types";
import { VerifyOnChainButton } from "@/components/linesman/verify-onchain-button";
import { IconArrowUpRight } from "@/components/linesman/icons";

/** Mobile-only sticky bottom action bar — the two things a fan actually taps on a market detail page. */
export function MarketDetailActionBar({
  fixtureId,
  proofRef,
  bestVenue,
}: {
  fixtureId: string;
  proofRef: ProofRef;
  bestVenue?: VenuePrice;
}) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-[color:var(--color-border)] bg-[color:var(--color-surface)]/95 px-4 pt-2.5 backdrop-blur lg:hidden"
      style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom))" }}
    >
      <div className="flex-1">
        <VerifyOnChainButton fixtureId={fixtureId} proofRef={proofRef} compact />
      </div>
      {bestVenue && (
        <a
          href={bestVenue.venueUrl}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-11 flex-1 items-center justify-center gap-1 rounded-full py-2.5 text-center text-xs font-semibold text-[color:var(--color-bg)] transition-transform active:scale-[0.97]"
          style={{ background: "var(--color-accent)" }}
        >
          Trade on {bestVenue.venue === "polymarket" ? "Polymarket" : "Kalshi"}
          <IconArrowUpRight className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}
