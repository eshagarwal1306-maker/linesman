import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * Client-facing wrapper around the real `/api/txline/validate` on-chain
 * `validateStatV2` primitive (see `lib/txline/validation.ts` — that logic is
 * unmodified boilerplate, mirroring TxLINE's own devnet validation example).
 *
 * Graceful ladder (never a dead button):
 *  1. If this card isn't backed by a live numeric TxLINE fixture id, there is
 *     no stat-validation call to make — return `fallback` immediately with
 *     whatever anchored packet hash / explorer link we already have.
 *  2. Otherwise attempt the real on-chain call. Any failure (no session, no
 *     activated credential, proof mismatch, RPC error, unsupported network)
 *     also returns `fallback`, never a raw 500 to the button.
 */

const requestSchema = z.object({
  fixtureId: z.string(),
  network: z.enum(["devnet", "mainnet"]).default("devnet"),
  seq: z.number().int().nonnegative().default(0),
  statKeys: z.array(z.number().int().nonnegative()).min(1).max(8).default([0, 1]),
  fallback: z
    .object({
      merkleRoot: z.string().optional(),
      txSignature: z.string().optional(),
      slot: z.number().optional(),
    })
    .optional(),
});

interface FallbackInput {
  network: "devnet" | "mainnet";
  fallback?: { merkleRoot?: string; txSignature?: string; slot?: number };
}

function fallbackResponse(input: FallbackInput, reason: string, category?: string) {
  return NextResponse.json({
    status: "fallback" as const,
    reason,
    category,
    network: input.network,
    merkleRoot: input.fallback?.merkleRoot,
    txSignature: input.fallback?.txSignature,
    slot: input.fallback?.slot,
  });
}

export async function POST(request: Request) {
  let input: z.infer<typeof requestSchema>;
  try {
    input = requestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ status: "failed", reason: "Malformed verification request" }, { status: 400 });
  }

  const numericFixture = /^txl-(\d+)$/.exec(input.fixtureId);
  if (!numericFixture) {
    return fallbackResponse(
      input,
      "This card is seeded/replayed demo data, not a live TxLINE fixture, so there's no on-chain stat to query yet.",
      "not_live_fixture",
    );
  }

  try {
    const upstream = await fetch(new URL("/api/txline/validate", request.url), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: request.headers.get("cookie") ?? "",
        origin: new URL(request.url).origin,
      },
      body: JSON.stringify({
        network: input.network,
        fixtureId: Number(numericFixture[1]),
        seq: input.seq,
        statKeys: input.statKeys,
      }),
    });
    const payload = (await upstream.json()) as {
      error?: string;
      category?: string;
      valid?: boolean;
      rootPda?: string;
      epochDay?: number;
      stats?: unknown;
    };
    if (!upstream.ok) {
      return fallbackResponse(input, payload.error ?? "On-chain validation call failed", payload.category);
    }
    return NextResponse.json({
      status: payload.valid ? "verified" : "failed",
      reason: payload.valid ? undefined : "On-chain root did not match the proof for this stat set",
      rootPda: payload.rootPda,
      epochDay: payload.epochDay,
      stats: payload.stats,
      network: input.network,
    });
  } catch (error) {
    return fallbackResponse(input, error instanceof Error ? error.message : "On-chain validation call failed");
  }
}
