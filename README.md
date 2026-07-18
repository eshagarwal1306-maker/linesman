# TxLINE Solana starter

A neutral Next.js foundation for wallet-authenticated TxLINE access, live World Cup data, historical replay, and read-only Solana proof validation. It is integration infrastructure, not a wagering product.

## Prerequisites

- Node.js 20 or newer and Corepack/pnpm
- A Neon PostgreSQL database
- A Solana wallet that supports both transaction and message signing
- Devnet SOL for the manual devnet subscription flow

## Local setup

```bash
corepack enable
pnpm install
cp .env.example .env.local
openssl rand -base64 32
pnpm db:migrate
pnpm dev
```

Set the `openssl` output as `CREDENTIAL_ENCRYPTION_KEY_BASE64`. Configure `DATABASE_URL`, `SESSION_COOKIE_NAME`, `NEXT_PUBLIC_APP_URL`, and both public RPC URLs as shown in `.env.example`. Never use a public environment variable for a TxLINE JWT, API token, database URL, or encryption key.

Useful checks:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm exec playwright install chromium
pnpm test:e2e
pnpm build
pnpm db:generate
```

## Networks

| Network | Program | TxLINE host | Free service levels |
| --- | --- | --- | --- |
| devnet | `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J` | `https://txline-dev.txodds.com` | `1` |
| mainnet | `9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA` | `https://txline.txodds.com` | `1`, `12` |

Level 1 is the delayed 60-second feed. Mainnet level 12 is real-time. Every subscription lasts exactly four weeks. RPC, API host, program, mint, supported levels, IDL, and encrypted credential are selected as one network-scoped unit.

## Architecture and activation

The browser owns wallet prompts and sends the subscription transaction. Route handlers own HTTP-only sessions, encrypted credentials, API proxying, JWT renewal, and short-lived SSE proxy responses. PostgreSQL stores no stream events.

Activation is:

1. `POST /auth/guest/start` on the selected TxLINE host.
2. Submit `subscribe(serviceLevelId, 4)` to the selected network program.
3. Sign the exact UTF-8 preimage `${txSig}::${jwt}` (the middle leagues field is empty).
4. Send the base64 wallet signature and `leagues: []` to `/api/token/activate`.
5. Encrypt the returned API token server-side. It is never returned to browser JavaScript. The guest JWT is exposed only in step 3's one-time preimage.

The proxy uses `/api/fixtures/snapshot`, `/api/odds/snapshot/:fixtureId`, `/api/scores/snapshot/:fixtureId`, `/api/odds/stream`, `/api/scores/stream`, `/api/scores/historical/:fixtureId`, and `/api/scores/stat-validation`. A `401` renews the same-network guest JWT once; a `403` is reported as a wallet/subscription/network mismatch. `POST /api/txline/setup/reset` clears a stored credential and, on request, starts a fresh guest session so a wallet can resubscribe without leaving stale TxLINE state behind.

Browser stream buffers retain at most 250 messages. Sequence values are preserved exactly and records without a real `seq`/`Seq` cannot be verified. Vercel functions are not permanent workers: the stream route has a 60-second maximum duration and the browser reconnects with `Last-Event-ID` and bounded exponential backoff.

`MatchWorkspace` (`src/components/match-workspace.tsx`) is the post-activation surface: it lists fixtures, decodes the live odds stream into plain-language StablePrice ticks (`src/lib/txline/odds-format.ts`), and hosts replay and proof validation for the selected match in one place. Fixture list filtering (e.g. which matches are eligible for historical replay) lives in `src/lib/txline/fixtures.ts`, and both modules have Vitest coverage alongside their implementation.

## Manual devnet checklist

These steps require real external accounts and are not covered by mocked automation:

1. Create a Neon database, apply `pnpm db:migrate`, and start the app with server-only secrets configured.
2. Fund a compatible wallet with devnet SOL and connect it on devnet.
3. Sign in, create the guest credential, and submit service-level-1 for four weeks.
4. Inspect and sign `${txSig}::${jwt}`, activate, reload, and confirm the setup resumes as ready.
5. Fetch fixtures plus odds and score snapshots.
6. Open both streams; confirm a quiet stream becomes `idle`, not failed.
7. Replay an eligible completed fixture.
8. Choose a score record with a genuine sequence and validate at least one stat through the read-only `validateStatV2` view.
9. Check application and platform logs contain no JWT, API token, authorization header, login signature, or activation signature.

For Vercel, create a project, attach all `.env.example` variables with the production URL, attach a production Neon branch, run migrations against that branch, deploy, then repeat steps 2–9 on the deployed URL.

## Troubleshooting

- `401`: the guest JWT renewal failed or the renewed JWT was rejected.
- `403`: verify wallet ownership, subscription state, service level, and selected network.
- Insufficient SOL: fund the active cluster; devnet and mainnet balances are unrelated.
- Missing `signMessage`: switch to a compatible wallet.
- Quiet stream: wait for events; idle is expected when no match update is published.
- Malformed proof: a hash was not exactly 32 bytes.
- Root mismatch: confirm the proof timestamp, selected network, and derived epoch-day account.
- Incomplete stat coverage: request only stat keys returned by the proof endpoint.

## API feedback

Record hackathon/live findings here without substituting mock data:

- Guest/activation availability:
- Fixture and stream observations:
- Proof payload compatibility:
- Network or service-level discrepancies:
