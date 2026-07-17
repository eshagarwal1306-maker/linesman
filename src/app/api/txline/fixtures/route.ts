import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSession } from "@/lib/auth/session";
import { txlineFetch } from "@/lib/txline/client";

const networkSchema = z.enum(["devnet", "mainnet"]);

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const url = new URL(request.url);
    const network = networkSchema.parse(url.searchParams.get("network"));
    url.searchParams.delete("network");
    const query = url.searchParams.toString();
    const upstream = await txlineFetch(
      session.userId,
      network,
      `/api/fixtures/snapshot${query ? `?${query}` : ""}`,
    );
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fixture request failed" },
      { status: 400 },
    );
  }
}
