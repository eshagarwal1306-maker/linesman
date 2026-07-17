import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSession } from "@/lib/auth/session";
import { txlineFetch } from "@/lib/txline/client";

export const runtime = "nodejs";
export const maxDuration = 60;

const inputSchema = z.object({
  network: z.enum(["devnet", "mainnet"]),
  kind: z.enum(["odds", "scores"]),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ kind: string }> },
) {
  try {
    const session = await requireSession();
    const { kind } = await context.params;
    const { network } = inputSchema.parse({
      kind,
      network: new URL(request.url).searchParams.get("network"),
    });
    const headers = new Headers({
      Accept: "text/event-stream",
      "Cache-Control": "no-cache",
    });
    const lastEventId = request.headers.get("last-event-id");
    if (lastEventId) headers.set("Last-Event-ID", lastEventId);
    const upstream = await txlineFetch(
      session.userId,
      network,
      `/api/${kind}/stream`,
      { headers },
    );
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stream request failed" },
      { status: 400 },
    );
  }
}
