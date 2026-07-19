"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ProofRef } from "@/lib/types";
import { explorerUrl, shortHash, shortSignature } from "@/lib/solana/proofs";
import { VerifyOnChainButton } from "@/components/linesman/verify-onchain-button";
import { IconArrowUpRight, IconChainLink, IconChevronRight } from "@/components/linesman/icons";

export function VerifyStrip({
  proofRef,
  packetTimestamp,
  fixtureId,
}: {
  proofRef: ProofRef;
  packetTimestamp: number;
  fixtureId: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 w-full items-center justify-between rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3 text-left transition-transform active:scale-[0.98]"
      >
        <span className="flex items-center gap-2 text-sm text-[color:var(--color-text)]">
          <IconChainLink className="h-4 w-4 text-[color:var(--color-accent)]" />
          Anchored on Solana · slot {proofRef.slot?.toLocaleString()}
        </span>
        <IconChevronRight className="h-4 w-4 text-[color:var(--color-muted)]" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="linesman w-full max-w-[480px] rounded-t-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5"
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[color:var(--color-border)]" />
              <h3 className="font-display text-lg text-[color:var(--color-text)]">Proof receipt</h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[color:var(--color-muted)]">Packet timestamp</dt>
                  <dd className="text-[color:var(--color-text)]">{new Date(packetTimestamp).toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[color:var(--color-muted)]">Slot</dt>
                  <dd className="font-mono text-[color:var(--color-text)]">{proofRef.slot?.toLocaleString() ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[color:var(--color-muted)]">Tx signature</dt>
                  <dd className="font-mono text-[color:var(--color-text)]">{shortSignature(proofRef.txSignature)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[color:var(--color-muted)]">Merkle root</dt>
                  <dd className="font-mono text-[color:var(--color-text)]">{shortHash(proofRef.merkleRoot)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[color:var(--color-muted)]">Network</dt>
                  <dd className="text-[color:var(--color-text)]">{proofRef.network ?? "devnet"}</dd>
                </div>
              </dl>

              {explorerUrl(proofRef) && (
                <a
                  href={explorerUrl(proofRef)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 flex items-center justify-center gap-1 text-center text-sm font-medium underline"
                  style={{ color: "var(--color-accent)" }}
                >
                  View on Solana Explorer <IconArrowUpRight className="h-3.5 w-3.5" />
                </a>
              )}

              <div className="mt-4">
                <VerifyOnChainButton fixtureId={fixtureId} proofRef={proofRef} />
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-3 min-h-11 w-full rounded-full border border-[color:var(--color-border)] py-2.5 text-sm text-[color:var(--color-muted)]"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
