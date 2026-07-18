import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSession } from "@/lib/auth/session";
import { txlineFetch } from "@/lib/txline/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
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
    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => "");
      return NextResponse.json(
        {
          error: `Upstream ${kind} stream failed (${upstream.status})`,
          detail: detail.slice(0, 300),
        },
        { status: upstream.status || 502 },
      );
    }

    const encoder = new TextEncoder();
    const reader = upstream.body.getReader();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        // Flush immediately so the browser leaves "connecting" even if TxLINE
        // is quiet and only heartbeats arrive later.
        controller.enqueue(encoder.encode(": proxy-open\n\n"));
      },
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        controller.enqueue(value);
      },
      cancel() {
        void reader.cancel();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
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
