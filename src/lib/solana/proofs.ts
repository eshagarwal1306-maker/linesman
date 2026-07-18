import type { ProofRef } from "@/lib/types";

/**
 * Solana proof display helpers — formats what every packet already carries
 * (slot, tx signature, merkle root, epoch day) for the Verify strip and
 * Watchdog rows. The actual on-chain `validateStatV2` call lives behind
 * `/api/verify/score` (see `components/linesman/verify-onchain-button.tsx`
 * and `docs/ONCHAIN.md`) — this module only formats inputs/outputs.
 */

export function explorerUrl(proofRef: ProofRef): string | undefined {
  if (!proofRef.txSignature) return undefined;
  const cluster = proofRef.network === "mainnet" ? "" : "?cluster=devnet";
  return `https://explorer.solana.com/tx/${proofRef.txSignature}${cluster}`;
}

/** Explorer link for an on-chain account (e.g. the daily-scores-roots PDA a validateStatV2 call read from). */
export function accountExplorerUrl(address: string | undefined, network: "devnet" | "mainnet" = "devnet"): string | undefined {
  if (!address) return undefined;
  const cluster = network === "mainnet" ? "" : "?cluster=devnet";
  return `https://explorer.solana.com/address/${address}${cluster}`;
}

export function shortSignature(signature: string | undefined): string {
  if (!signature) return "—";
  return `${signature.slice(0, 6)}…${signature.slice(-6)}`;
}

export function shortHash(hash: string | undefined): string {
  if (!hash) return "—";
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
}

