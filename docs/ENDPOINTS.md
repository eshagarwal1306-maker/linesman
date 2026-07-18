# Endpoints

Auto-maintained inventory of every external endpoint/stream Linesman calls,
plus the app's own API surface. Update this file whenever a new upstream
call is added (see `docs/FRICTION.md` for papercuts hit along the way).

## TxLINE (`https://txline-dev.txodds.com` devnet / `https://txline.txodds.com` mainnet)

| Endpoint | Method | Used by | Purpose |
|---|---|---|---|
| `/auth/guest/start` | POST | `lib/txline/client.ts`, `api/txline/setup/start`, `api/txline/setup/reset` | Issue/renew a guest JWT before wallet subscription. |
| `/api/token/activate` | POST | `api/txline/setup/activate` | Exchange a confirmed on-chain subscription for a service API token. |
| `/api/fixtures/snapshot` | GET | `api/txline/fixtures`, `lib/sources/txline.ts` | List fixtures (optionally filtered) for the connected network. |
| `/api/odds/snapshot/{fixtureId}` | GET | `api/txline/odds/[fixtureId]`, `lib/sources/txline.ts` | Latest odds tick for one fixture — the real "sharp line" source. |
| `/api/scores/snapshot/{fixtureId}` | GET | `api/txline/scores/[fixtureId]` | Latest score/stat tick for one fixture. |
| `/api/scores/historical/{fixtureId}` | GET | `api/txline/history/[fixtureId]` | Historical score ticks for one fixture. |
| `/api/scores/stat-validation` | GET | `api/txline/validate` | Merkle proof of a proven stat, input to the on-chain `validateStatV2` check (see `docs/ONCHAIN.md`). |
| `/api/{odds,scores}/stream` | GET (SSE) | `api/txline/stream/[kind]` | Live server-sent packet stream — the tap point for `lib/sources/recorder.ts`. |

All of the above (except `/auth/guest/start`) require `Authorization: Bearer <jwt>` + `X-Api-Token` headers, attached by `lib/txline/client.ts#txlineFetch`.

## Solana

| Call | Used by | Purpose |
|---|---|---|
| `subscribe` instruction (TxLINE program) | `/starter` wallet flow (existing boilerplate) | On-chain subscription that unlocks a service level. |
| `validateStatV2` view call (TxLINE program, `.view()`) | `api/txline/validate` → `api/verify/score` → `VerifyOnChainButton`; `scripts/verify-cli.ts` | Confirms a stat-validation proof against the on-chain `daily_scores_roots` PDA. |
| Solana Explorer links | `lib/solana/proofs.ts` | Human-facing receipts for tx signatures and on-chain accounts. |

## Third-party venues

| Endpoint | Used by | Purpose |
|---|---|---|
| `https://gamma-api.polymarket.com/events/slug/world-cup-winner` | `lib/sources/polymarket.ts` → `api/live/winner-market` → `LiveTicker` | Real, public World Cup Winner outright market — the one genuinely live non-TxLINE price feed wired into the ticker today. |

## This app's own API (for judges / `/health` backup requirement)

| Route | Purpose |
|---|---|
| `GET /health` | `{ ok, mode, lastPacketAt, dbOk, version }` — liveness probe. |
| `GET /api/status` | Current `SourceStatus` (live/replay/mock + packet counts). |
| `GET /api/edges` | Ranked mispricing edges for the Feed, routed through `lib/sources/manager.ts`. |
| `GET /api/watchdog` | Settlement audits + summary for the Watchdog tab. |
| `POST /api/verify/score` | Graceful-ladder wrapper around the on-chain `validateStatV2` check. |
| `GET /api/live/winner-market` | Live Polymarket World Cup Winner snapshot. |
| `POST /api/internal/record` | Secret-protected tick endpoint for `pnpm record` (see `lib/sources/recorder.ts`). |
