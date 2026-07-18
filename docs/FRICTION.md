# Integration friction log

Append-only. Each entry: what we hit, what we did about it.

---

**`drizzle-kit` doesn't read `.env.local`.** The Drizzle CLI (`db:generate`,
`db:migrate`) only sees `process.env`, not Next's `.env.local` convention.
Worked around by exporting `DATABASE_URL` in the shell before running
migrations; a real fix would be a `dotenv -e .env.local --` wrapper.

**Tailwind v4 cascade layers vs. legacy unlayered CSS.** The starter's
global CSS used bare element selectors (`h1`, `a`, `button`) with no
`@layer`. Since unlayered rules beat `@layer` rules regardless of source
order, Tailwind utility classes on the same tags were silently losing to
the old styles (headings staying huge/clamped on desktop). Fixed by
wrapping every legacy rule in `@layer base` in `globals.css`.

**`server-only` throws outside the Next.js bundler.** Any module that
`import "server-only"` (our `db/client.ts`, `lib/txline/credentials.ts`,
`lib/sources/recorder.ts`, etc.) throws immediately if required from a
plain Node/tsx process — the package's "react-server" export condition is
what neuters it, and that condition only exists inside Next's own bundling.
This meant `scripts/record.ts` (a genuinely headless recorder meant to run
with no browser open) *cannot* import the credential/DB layer directly.
Worked around by giving the recorder a small authenticated HTTP tick
endpoint (`POST /api/internal/record`) inside the running Next server, and
having the standalone script just poll that over plain `fetch` — same
pattern a keeper bot would use against a deployed instance anyway.

**No public per-match venue price API.** Polymarket/Kalshi only expose
headline outright markets (e.g. "World Cup Winner") through discoverable
public endpoints — there's no catalog of every regular fixture's own
match-winner market. That means a genuinely live TxLINE sharp line for an
arbitrary in-progress match currently has no real venue price to pair with
into an Edge; `lib/sources/manager.ts` reports the TxLINE connection as
healthy (`liveTxlineConnected`) without fabricating an edge from it. The one
real live venue integration we do have (Polymarket's WC Winner outright) is
wired into the ticker instead, where the market types genuinely match.

**`validateStatV2` stat-key semantics aren't documented publicly.** The
on-chain call needs specific integer "stat keys" (e.g. which key means "home
goals") that come from TxLINE's own internal registry. Without that
registry we use placeholder keys (`[0, 1]`) in `/api/verify/score` and
`scripts/verify-cli.ts` — correct proof-format and on-chain call shape, but
the "verified" happy path needs TxLINE's real key table to resolve
semantically instead of just structurally.

**Recharts `Tooltip` formatter typings.** `labelFormatter`/`formatter` props
type their arguments loosely (`unknown`-ish), so `detail-gap-chart.tsx`
casts to `number` explicitly inside the callbacks rather than fighting the
generic signature.
