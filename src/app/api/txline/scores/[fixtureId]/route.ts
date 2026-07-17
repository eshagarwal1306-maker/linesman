import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSession } from "@/lib/auth/session";
import { txlineFetch } from "@/lib/txline/client";

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
      `/api/scores/snapshot/${fixtureId}`,
    );
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Score request failed" },
      { status: 400 },
    );
  }
}
