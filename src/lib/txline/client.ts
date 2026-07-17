import "server-only";

import { getNetworkConfig, type Network } from "@/lib/network/config";
import {
  getCredential,
  upsertCredentialState,
  type TxlineCredential,
} from "@/lib/txline/credentials";

export class TxlineAccessError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403,
  ) {
    super(message);
  }
}

function authenticatedInit(
  credential: TxlineCredential,
  init?: RequestInit,
): RequestInit {
  if (!credential.apiToken || credential.setupState !== "activated") {
    throw new TxlineAccessError("TxLINE setup is not activated", 403);
  }
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${credential.jwt}`);
  headers.set("X-Api-Token", credential.apiToken);
  return { ...init, headers, cache: "no-store" };
}

export async function txlineFetch(
  userId: string,
  network: Network,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  let credential = await getCredential(userId, network);
  if (!credential) {
    throw new TxlineAccessError("No credential for selected network", 403);
  }
  const origin = getNetworkConfig(network).apiOrigin;
  let response = await fetch(
    new URL(path, origin),
    authenticatedInit(credential, init),
  );
  if (response.status === 403) {
    throw new TxlineAccessError(
      "TxLINE rejected this wallet, subscription, or network",
      403,
    );
  }
  if (response.status !== 401) return response;

  const renewal = await fetch(`${origin}/auth/guest/start`, {
    method: "POST",
    cache: "no-store",
  });
  if (!renewal.ok) {
    throw new TxlineAccessError("TxLINE JWT renewal failed", 401);
  }
  const result = (await renewal.json()) as { token?: string };
  if (!result.token) {
    throw new TxlineAccessError("TxLINE JWT renewal returned no token", 401);
  }
  await upsertCredentialState({
    userId,
    network,
    jwt: result.token,
    apiToken: credential.apiToken,
    setupState: credential.setupState,
    subscriptionTxSignature: credential.subscriptionTxSignature,
    serviceLevelId: credential.serviceLevelId,
    durationWeeks: credential.durationWeeks,
    subscriptionCreatedAt: credential.subscriptionCreatedAt,
  });
  credential = { ...credential, jwt: result.token };
  response = await fetch(
    new URL(path, origin),
    authenticatedInit(credential, init),
  );
  if (response.status === 401 || response.status === 403) {
    throw new TxlineAccessError(
      response.status === 401
        ? "TxLINE rejected the renewed JWT"
        : "TxLINE rejected this wallet, subscription, or network",
      response.status,
    );
  }
  return response;
}
