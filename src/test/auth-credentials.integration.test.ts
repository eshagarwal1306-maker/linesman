import nacl from "tweetnacl";
import bs58 from "bs58";
import { beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  nonceAvailable: true,
  sessionToken: "",
  userId: "11111111-1111-4111-8111-111111111111",
  walletPublicKey: "",
}));

const schema = vi.hoisted(() => ({
  walletNonces: {
    id: "nonce.id",
    walletPublicKey: "nonce.wallet",
    nonceHash: "nonce.hash",
    expiresAt: "nonce.expires",
    consumedAt: "nonce.consumed",
  },
  users: {
    id: "users.id",
    walletPublicKey: "users.wallet",
  },
  sessions: {
    id: "sessions.id",
    userId: "sessions.user",
    tokenHash: "sessions.hash",
    expiresAt: "sessions.expires",
    revokedAt: "sessions.revoked",
  },
  txlineCredentials: { userId: "credentials.user", network: "credentials.network" },
}));

const db = vi.hoisted(() => ({
  insert: vi.fn((table: unknown) => ({
    values: vi.fn((values: Record<string, unknown>) => {
      if (table === schema.users) {
        state.walletPublicKey = values.walletPublicKey as string;
        return {
          onConflictDoUpdate: vi.fn(() => ({
            returning: vi.fn(async () => [
              { id: state.userId, walletPublicKey: state.walletPublicKey },
            ]),
          })),
        };
      }
      if (table === schema.sessions) {
        return {
          returning: vi.fn(async () => [{ id: "session-id" }]),
        };
      }
      return Promise.resolve();
    }),
  })),
  update: vi.fn((table: unknown) => ({
    set: vi.fn(() => ({
      where: vi.fn(() =>
        table === schema.walletNonces
          ? {
              returning: vi.fn(async () => {
                if (!state.nonceAvailable) return [];
                state.nonceAvailable = false;
                return [{ id: "nonce-id" }];
              }),
            }
          : Promise.resolve(),
      ),
    })),
  })),
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      innerJoin: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [
            {
              sessionId: "session-id",
              userId: state.userId,
              walletPublicKey: state.walletPublicKey,
            },
          ]),
        })),
      })),
    })),
  })),
  query: {
    txlineCredentials: {
      findFirst: vi.fn(async () => null),
    },
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDb: () => db }));
vi.mock("@/db/schema", () => schema);
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () =>
      state.sessionToken
        ? { name: "txline_session", value: state.sessionToken }
        : undefined,
    delete: vi.fn(),
  }),
}));
vi.mock("@/lib/security/encryption", () => ({
  decryptSecret: (value: string) => value,
  encryptSecret: (value: string) => value,
}));

beforeEach(() => {
  state.nonceAvailable = true;
  state.sessionToken = "";
  state.walletPublicKey = "";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
});

it("authenticates a signed wallet once and keeps credentials user/network scoped", async () => {
  const keypair = nacl.sign.keyPair();
  const walletPublicKey = bs58.encode(keypair.publicKey);
  const { POST: nonce } = await import("@/app/api/auth/nonce/route");
  const { POST: verify } = await import("@/app/api/auth/verify/route");
  const { GET: session } = await import("@/app/api/auth/session/route");
  const { getCredential } = await import("@/lib/txline/credentials");

  const nonceResponse = await nonce(
    new Request("http://localhost:3000/api/auth/nonce", {
      method: "POST",
      body: JSON.stringify({ walletPublicKey }),
    }),
  );
  const challenge = (await nonceResponse.json()) as {
    nonce: string;
    issuedAt: string;
    expiresAt: string;
    message: string;
  };
  const signature = nacl.sign.detached(
    Buffer.from(challenge.message),
    keypair.secretKey,
  );
  const body = {
    walletPublicKey,
    nonce: challenge.nonce,
    issuedAt: challenge.issuedAt,
    expiresAt: challenge.expiresAt,
    signature: Buffer.from(signature).toString("base64"),
  };

  const verifyResponse = await verify(
    new Request("http://localhost:3000/api/auth/verify", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
  expect(verifyResponse.status).toBe(200);
  expect(verifyResponse.headers.get("set-cookie")).toContain("HttpOnly");
  state.sessionToken =
    /txline_session=([^;]+)/.exec(
      verifyResponse.headers.get("set-cookie") ?? "",
    )?.[1] ?? "";
  const sessionResponse = await session();
  expect((await sessionResponse.json()).walletPublicKey).toBe(walletPublicKey);

  const reused = await verify(
    new Request("http://localhost:3000/api/auth/verify", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
  expect(reused.status).toBe(409);
  expect(await getCredential("other-user", "devnet")).toBeNull();
  expect(await getCredential(state.userId, "mainnet")).toBeNull();
});
