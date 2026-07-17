import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt, isNull } from "drizzle-orm";
import bs58 from "bs58";
import nacl from "tweetnacl";

import { getDb } from "@/db/client";
import { sessions, users, walletNonces } from "@/db/schema";
import { buildLoginMessage } from "./message";

const NONCE_TTL_MS = 5 * 60 * 1_000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1_000;
const rateLimits = new Map<string, { count: number; resetsAt: number }>();

export const SESSION_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME ?? "txline_session";

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const expected = new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? request.url,
  ).origin;
  if (origin !== expected) throw new Error("Cross-origin request rejected");
}

export function enforceRateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000,
): void {
  const now = Date.now();
  if (rateLimits.size > 5_000) {
    for (const [candidate, entry] of rateLimits) {
      if (entry.resetsAt <= now) rateLimits.delete(candidate);
    }
  }
  const current = rateLimits.get(key);
  if (!current || current.resetsAt <= now) {
    rateLimits.set(key, { count: 1, resetsAt: now + windowMs });
    return;
  }
  if (current.count >= limit) throw new Error("Too many requests");
  current.count += 1;
}

export type SessionIdentity = {
  sessionId: string;
  userId: string;
  walletPublicKey: string;
};

export async function createLoginChallenge(
  walletPublicKey: string,
  domain: string,
): Promise<{
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  message: string;
}> {
  // Validate that the supplied wallet key is an Ed25519 public key.
  if (bs58.decode(walletPublicKey).length !== nacl.sign.publicKeyLength) {
    throw new Error("Invalid Solana wallet public key");
  }
  const nonce = randomBytes(24).toString("base64url");
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + NONCE_TTL_MS);
  await getDb().insert(walletNonces).values({
    walletPublicKey,
    nonceHash: hash(nonce),
    expiresAt,
  });
  return {
    nonce,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    message: buildLoginMessage({
      domain,
      walletPublicKey,
      nonce,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    }),
  };
}

export async function verifyLoginAndCreateSession(input: {
  domain: string;
  walletPublicKey: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  signature: string;
}): Promise<{ token: string; identity: SessionIdentity }> {
  const message = buildLoginMessage(input);
  const publicKey = bs58.decode(input.walletPublicKey);
  const signature = Buffer.from(input.signature, "base64");
  if (
    publicKey.length !== nacl.sign.publicKeyLength ||
    signature.length !== nacl.sign.signatureLength ||
    !nacl.sign.detached.verify(
      Buffer.from(message, "utf8"),
      signature,
      publicKey,
    )
  ) {
    throw new Error("Invalid wallet signature");
  }

  const [consumed] = await getDb()
    .update(walletNonces)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(walletNonces.walletPublicKey, input.walletPublicKey),
        eq(walletNonces.nonceHash, hash(input.nonce)),
        eq(walletNonces.expiresAt, new Date(input.expiresAt)),
        isNull(walletNonces.consumedAt),
        gt(walletNonces.expiresAt, new Date()),
      ),
    )
    .returning({ id: walletNonces.id });
  if (!consumed) throw new Error("Nonce is expired or already consumed");

  const [user] = await getDb()
    .insert(users)
    .values({ walletPublicKey: input.walletPublicKey })
    .onConflictDoUpdate({
      target: users.walletPublicKey,
      set: { updatedAt: new Date() },
    })
    .returning({ id: users.id, walletPublicKey: users.walletPublicKey });

  const token = randomBytes(32).toString("base64url");
  const [session] = await getDb()
    .insert(sessions)
    .values({
      userId: user.id,
      tokenHash: hash(token),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    })
    .returning({ id: sessions.id });

  return {
    token,
    identity: {
      sessionId: session.id,
      userId: user.id,
      walletPublicKey: user.walletPublicKey,
    },
  };
}

export async function getSessionByToken(
  token: string | undefined,
): Promise<SessionIdentity | null> {
  if (!token) return null;
  const [row] = await getDb()
    .select({
      sessionId: sessions.id,
      userId: users.id,
      walletPublicKey: users.walletPublicKey,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenHash, hash(token)),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!row) return null;
  await getDb()
    .update(sessions)
    .set({ lastSeenAt: new Date() })
    .where(eq(sessions.id, row.sessionId));
  return row;
}

export async function requireSession(): Promise<SessionIdentity> {
  const cookieStore = await cookies();
  const identity = await getSessionByToken(
    cookieStore.get(SESSION_COOKIE_NAME)?.value,
  );
  if (!identity) throw new Error("Unauthorized");
  return identity;
}

export async function revokeSession(token: string | undefined): Promise<void> {
  if (!token) return;
  await getDb()
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.tokenHash, hash(token)));
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_MS / 1_000,
};
