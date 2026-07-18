import "server-only";

import { getDb } from "@/db/client";
import { recordings, venueSnapshots } from "@/db/schema";

/**
 * Recorder — a tap on whatever live source is flowing, appended verbatim.
 * Zero transformation on write; the replay engine (`lib/engine/replay.ts`)
 * decodes on read. This is what `pnpm record` (scripts/record.ts) calls.
 */

export async function appendRawPacket(recordingId: string, kind: string, raw: unknown): Promise<void> {
  await getDb().insert(recordings).values({ recordingId, kind, raw: raw as object });
}

export async function appendVenueSnapshot(recordingId: string, venue: string, raw: unknown): Promise<void> {
  await getDb().insert(venueSnapshots).values({ recordingId, venue, raw: raw as object });
}
