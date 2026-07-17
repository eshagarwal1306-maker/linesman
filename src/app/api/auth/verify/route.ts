import { NextResponse } from "next/server";
import { z } from "zod";

import {
  assertSameOrigin,
  enforceRateLimit,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
  verifyLoginAndCreateSession,
} from "@/lib/auth/session";

const requestSchema = z.object({
  walletPublicKey: z.string().min(32).max(64),
  nonce: z.string().min(16),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  signature: z.string().min(1),
});

export async function POST(request: Request) {
  let input: z.infer<typeof requestSchema>;
  try {
    input = requestSchema.parse(await request.json());
    assertSameOrigin(request);
    enforceRateLimit(`auth:${input.walletPublicKey}`, 8);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  try {
    const domain = new URL(
      process.env.NEXT_PUBLIC_APP_URL ?? request.url,
    ).host;
    const { token, identity } = await verifyLoginAndCreateSession({
      ...input,
      domain,
    });
    const response = NextResponse.json(identity);
    response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sign-in failed";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Nonce") ? 409 : 401 },
    );
  }
}
