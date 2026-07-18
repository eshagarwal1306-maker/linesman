"use client";

import { useState } from "react";
import type { ProofRef } from "@/lib/types";
import { accountExplorerUrl, explorerUrl, shortHash, shortSignature } from "@/lib/solana/proofs";

interface VerifyApiResult {
  status: "verified" | "failed" | "fallback";
  reason?: string;
  category?: string;
  rootPda?: string;
  epochDay?: number;
  merkleRoot?: string;
  txSignature?: string;
  slot?: number;
  network?: "devnet" | "mainnet";
}

type VerifyState = { phase: "idle" } | { phase: "checking" } | { phase: "done"; result: VerifyApiResult };

/** Module-scope cache: once a proof has been checked this session, don't re-query Solana on every re-render. */
const resultCache = new Map<string, VerifyApiResult>();

function cacheKeyFor(fixtureId: string, proofRef: ProofRef): string {
  return `${fixtureId}:${proofRef.txSignature ?? proofRef.merkleRoot ?? "none"}`;
}

export function VerifyOnChainButton({
  fixtureId,
  proofRef,
  compact = false,
}: {
  fixtureId: string;
  proofRef: ProofRef;
  compact?: boolean;
}) {
  const cacheKey = cacheKeyFor(fixtureId, proofRef);
  const [state, setState] = useState<VerifyState>(
    resultCache.has(cacheKey) ? { phase: "done", result: resultCache.get(cacheKey)! } : { phase: "idle" },
  );

  async function run() {
    setState({ phase: "checking" });
    let result: VerifyApiResult;
    try {
      const res = await fetch("/api/verify/score", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fixtureId,
          network: proofRef.network ?? "devnet",
          fallback: {
            merkleRoot: proofRef.merkleRoot,
            txSignature: proofRef.txSignature,
            slot: proofRef.slot,
          },
        }),
      });
      result = await res.json();
    } catch {
      result = {
        status: "fallback",
        reason: "Network error reaching the verification API — showing the anchored proof hash instead.",
        merkleRoot: proofRef.merkleRoot,
        txSignature: proofRef.txSignature,
        slot: proofRef.slot,
        network: proofRef.network,
      };
    }
    resultCache.set(cacheKey, result);
    setState({ phase: "done", result });
  }

  const base = compact
    ? "flex min-h-11 w-full items-center justify-center gap-2 rounded-full py-2.5 text-xs font-semibold transition-transform active:scale-[0.97]"
    : "flex min-h-11 w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold transition-transform active:scale-[0.98]";

  if (state.phase === "idle") {
    return (
      <button
        type="button"
        onClick={() => void run()}
        className={base}
        style={{ background: "var(--color-accent)", color: "var(--color-bg)" }}
      >
        {compact ? "Verify on-chain" : "⛓ Verify on-chain"}
      </button>
    );
  }

  if (state.phase === "checking") {
    return (
      <div
        className={base}
        style={{ border: "1px solid var(--color-border)", color: "var(--color-muted)", background: "transparent" }}
      >
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        Querying Solana…
      </div>
    );
  }

  const { result } = state;

  if (result.status === "verified") {
    const link = accountExplorerUrl(result.rootPda, result.network ?? "devnet");
    return (
      <div
        className="flex flex-col gap-1 rounded-xl px-3.5 py-2.5 text-xs"
        style={{ background: "color-mix(in srgb, var(--color-accent) 12%, transparent)", color: "var(--color-accent)" }}
      >
        <span className="font-semibold">✓ Score verified on-chain{result.epochDay != null ? ` · epoch ${result.epochDay}` : ""}</span>
        {link && (
          <a href={link} target="_blank" rel="noreferrer" className="underline">
            View daily root ↗
          </a>
        )}
      </div>
    );
  }

  if (result.status === "failed") {
    return (
      <div
        className="flex flex-col gap-1 rounded-xl px-3.5 py-2.5 text-xs"
        style={{ background: "color-mix(in srgb, var(--color-alert) 12%, transparent)", color: "var(--color-alert)" }}
      >
        <span className="font-semibold">✗ On-chain check failed</span>
        <span className="text-[color:var(--color-muted)]">{result.reason}</span>
      </div>
    );
  }

  // fallback — still real, still on-chain, just not the live view-call.
  const link = explorerUrl({ txSignature: result.txSignature, network: result.network });
  return (
    <div
      className="flex flex-col gap-1.5 rounded-xl border border-[color:var(--color-border)] px-3.5 py-2.5 text-xs"
      style={{ color: "var(--color-muted)" }}
    >
      <span>{result.reason ?? "Live on-chain check unavailable — showing the anchored proof instead."}</span>
      <div className="flex items-center justify-between gap-2 font-mono">
        <span>hash {shortHash(result.merkleRoot)}</span>
        {result.txSignature && <span>{shortSignature(result.txSignature)}</span>}
      </div>
      {link && (
        <a href={link} target="_blank" rel="noreferrer" className="font-medium underline" style={{ color: "var(--color-accent)" }}>
          View anchored packet ↗
        </a>
      )}
    </div>
  );
}
