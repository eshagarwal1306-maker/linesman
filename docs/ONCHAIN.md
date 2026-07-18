# On-chain trust model

**What's anchored.** Every TxLINE odds/score packet Linesman displays carries a
`ProofRef`: a Solana slot, a transaction signature (or, for the seeded demo
story, a deterministic stand-in of the same shape), a Merkle root, and an
epoch day. That root is TxLINE's own daily commitment of every fixture's
proven stats — written on-chain once per day, independent of this app.

**What we verify.** The "Verify on-chain" button (Watchdog rows, Market
Detail proof sheet) calls TxLINE's `validateStatV2` program method via
`/api/verify/score` → `/api/txline/validate`. Given a fixture, a sequence
number, and the stat keys we care about (e.g. final score), TxLINE returns a
Merkle proof; we submit that proof as a read-only `.view()` call against the
`daily_scores_roots` PDA for that fixture's epoch day. Solana itself confirms
or rejects the proof against the on-chain root — the check happens in the
validator, not in our server.

**The graceful ladder.** A card is only backed by a real numeric TxLINE
fixture id once it originates from a live, wallet-activated session. Until
then (or if the on-chain call fails for any reason — no session, RPC error,
unsupported network), the button falls back to displaying the packet's
already-anchored Merkle root hash and a Solana Explorer link for its
transaction. That fallback is still real, still on-chain — it's just the
commitment rather than a fresh live re-check. The button is never dead: every
branch resolves to either a live verification result or a genuine anchored
receipt.

**Headless proof.** `pnpm verify -- --fixture <id> --seq 0 --stats 0,1` runs
the identical proof-fetch → Merkle-format → `.view()` call from the command
line (`scripts/verify-cli.ts`), with no browser or session cookie involved —
just a TxLINE JWT/API token and an RPC connection.

**What a CPI settlement engine would add.** Today verification is read-only:
we ask Solana "does this proof match the root," and render the answer. A
settlement engine would go one step further and act on it — a keeper program
that watches TxLINE's daily roots, cross-references venue resolutions (the
Watchdog's job today, done in JS), and fires a CPI into a venue's own
settlement instruction (or a insurance/dispute vault) the moment a mismatch
is confirmed on-chain, closing the loop between "we detected a bad
settlement" and "the chain enforced a correction" without a human in the
middle. `scripts/verify-cli.ts` is the minimal building block that engine
would poll.
