import { NextResponse } from "next/server";
import { z } from "zod";

import {
  assertSameOrigin,
  createLoginChallenge,
  enforceRateLimit,
} from "@/lib/auth/session";

const requestSchema = z.object({
  walletPublicKey: z.string().min(32).max(64),
});

export async function POST(request: Request) {
  try {
    const { walletPublicKey } = requestSchema.parse(await request.json());
    assertSameOrigin(request);
    enforceRateLimit(`auth:${walletPublicKey}`, 8);
    const domain = new URL(
      process.env.NEXT_PUBLIC_APP_URL ?? request.url,
    ).host;
    return NextResponse.json(
      await createLoginChallenge(walletPublicKey, domain),
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request" },
      { status: 400 },
    );
  }
}
