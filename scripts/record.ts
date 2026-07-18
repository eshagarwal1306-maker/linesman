/**
 * scripts/record.ts
 *
 * Headless recorder loop — polls the live TxLINE odds tick every 5s and a
 * Polymarket venue snapshot every 60s, via the app's own `/api/internal/record`
 * endpoint (see that route for why this doesn't touch the DB directly).
 * Keeps running with no browser open; that's the whole point — the Replay
 * tab and Showcase mode need a real recording to play back.
 *
 * Usage:
 *   RECORDER_SECRET=... RECORDER_USER_ID=<uuid> pnpm record
 *
 * Env vars:
 *   BASE_URL            App origin to hit (default http://localhost:3000)
 *   RECORDER_SECRET     Must match RECORDER_SECRET configured on the server
 *   RECORDER_USER_ID    uuid of the user whose activated TxLINE credential to tap
 *   RECORDER_NETWORK    "devnet" (default) | "mainnet"
 *   RECORDING_ID        Defaults to SHOWCASE_RECORDING_ID or "wc26-final"
 *   ODDS_INTERVAL_MS     Default 5000
 *   VENUE_INTERVAL_MS    Default 60000
 */
import "dotenv/config";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const SECRET = process.env.RECORDER_SECRET;
const USER_ID = process.env.RECORDER_USER_ID;
const NETWORK = process.env.RECORDER_NETWORK ?? "devnet";
const RECORDING_ID = process.env.RECORDING_ID ?? process.env.SHOWCASE_RECORDING_ID ?? "wc26-final";
const ODDS_INTERVAL_MS = Number(process.env.ODDS_INTERVAL_MS ?? 5_000);
const VENUE_INTERVAL_MS = Number(process.env.VENUE_INTERVAL_MS ?? 60_000);

if (!SECRET || !USER_ID) {
  console.error("Missing RECORDER_SECRET / RECORDER_USER_ID env vars. See scripts/record.ts header for usage.");
  process.exit(1);
}

let oddsPacketsThisMinute = 0;
let totalOddsPackets = 0;
let totalVenueSnapshots = 0;

async function tick(kind: "odds" | "venue") {
  try {
    const res = await fetch(new URL("/api/internal/record", BASE_URL), {
      method: "POST",
      headers: { "content-type": "application/json", "x-recorder-secret": SECRET! },
      body: JSON.stringify({ recordingId: RECORDING_ID, kind, userId: USER_ID, network: NETWORK }),
    });
    const payload = await res.json();
    if (!res.ok) {
      console.warn(`[record] ${kind} tick failed: ${payload.error ?? res.status}`);
      return;
    }
    if (kind === "odds") {
      oddsPacketsThisMinute += payload.recorded ?? 0;
      totalOddsPackets += payload.recorded ?? 0;
    } else {
      totalVenueSnapshots += payload.recorded ?? 0;
    }
    if ((payload.recorded ?? 0) === 0 && payload.reason) {
      console.warn(`[record] ${kind} tick recorded nothing: ${payload.reason}`);
    }
  } catch (error) {
    console.warn(`[record] ${kind} tick errored:`, error instanceof Error ? error.message : error);
  }
}

console.log(`[record] starting — recordingId=${RECORDING_ID} network=${NETWORK} base=${BASE_URL}`);
console.log(`[record] odds every ${ODDS_INTERVAL_MS}ms, venue snapshot every ${VENUE_INTERVAL_MS}ms`);

setInterval(() => void tick("odds"), ODDS_INTERVAL_MS);
setInterval(() => void tick("venue"), VENUE_INTERVAL_MS);
setInterval(() => {
  console.log(`[record] ${new Date().toISOString()} — +${oddsPacketsThisMinute} odds packets this minute (total odds=${totalOddsPackets}, venue snapshots=${totalVenueSnapshots})`);
  oddsPacketsThisMinute = 0;
}, 60_000);

void tick("odds");
void tick("venue");
