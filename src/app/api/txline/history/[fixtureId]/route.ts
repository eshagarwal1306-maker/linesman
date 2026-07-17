import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSession } from "@/lib/auth/session";
import { txlineFetch } from "@/lib/txline/client";
import { normalizeScoreEvent } from "@/lib/txline/types";

const inputSchema = z.object({
  network: z.enum(["devnet", "mainnet"]),
  fixtureId: z.coerce.number().int().positive().safe(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ fixtureId: string }> },
) {
  try {
    const session = await requireSession();
    const { fixtureId } = await context.params;
    const { network } = inputSchema.parse({
      fixtureId,
      network: new URL(request.url).searchParams.get("network"),
    });
    const upstream = await txlineFetch(
      session.userId,
      network,
      `/api/scores/historical/${fixtureId}`,
    );
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `History request failed (${upstream.status})` },
        { status: upstream.status },
      );
    }
    const raw: unknown = await upstream.json();
    const records = Array.isArray(raw)
      ? raw
      : raw && typeof raw === "object" && "scores" in raw
        ? (raw as { scores: unknown }).scores
        : [];
    if (!Array.isArray(records)) throw new Error("Invalid history response");
    return NextResponse.json(
      records
        .map((record) => normalizeScoreEvent(record, "history"))
        .sort((a, b) => a.timestamp - b.timestamp),
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "History request failed" },
      { status: 400 },
    );
  }
}
