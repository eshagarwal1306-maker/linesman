import { NextResponse } from "next/server";
import { z } from "zod";
import { getLiveSharpLines, LiveTxlineUnavailableError } from "@/lib/sources/txline";
import { getLiveWinnerMarket } from "@/lib/sources/polymarket";
import { appendRawPacket, appendVenueSnapshot } from "@/lib/sources/recorder";

/**
 * Internal tick endpoint for `pnpm record` (scripts/record.ts). Kept as a
 * plain authenticated HTTP endpoint — rather than having the headless script
 * touch the DB/credential store directly — because every module that reads
 * encrypted TxLINE credentials is marked `server-only` and will throw if
 * imported from a bare Node/tsx process outside the Next.js server runtime.
 */

const bodySchema = z.object({
  recordingId: z.string().min(1),
  kind: z.enum(["odds", "venue"]),
  userId: z.string().uuid(),
  network: z.enum(["devnet", "mainnet"]).default("devnet"),
});

function assertSecret(request: Request): void {
  const expected = process.env.RECORDER_SECRET;
  if (!expected) throw new Error("RECORDER_SECRET is not configured on the server");
  if (request.headers.get("x-recorder-secret") !== expected) {
    throw new Error("Invalid recorder secret");
  }
}

export async function POST(request: Request) {
  try {
    assertSecret(request);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }

  let input: z.infer<typeof bodySchema>;
  try {
    input = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Malformed record request" }, { status: 400 });
  }

  if (input.kind === "venue") {
    const market = await getLiveWinnerMarket();
    if (!market) return NextResponse.json({ recorded: 0, reason: "Polymarket unavailable" });
    await appendVenueSnapshot(input.recordingId, "polymarket", market);
    return NextResponse.json({ recorded: 1 });
  }

  try {
    const lines = await getLiveSharpLines(input.userId, input.network);
    await Promise.all(lines.map((line) => appendRawPacket(input.recordingId, "odds", line)));
    return NextResponse.json({ recorded: lines.length });
  } catch (error) {
    if (error instanceof LiveTxlineUnavailableError) {
      return NextResponse.json({ recorded: 0, reason: error.message });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Recording failed" }, { status: 500 });
  }
}
