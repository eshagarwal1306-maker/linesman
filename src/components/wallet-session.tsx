"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";

type Session = { userId: string; walletPublicKey: string };

type TestWallet = {
  publicKey: string;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
};

declare global {
  interface Window {
    __TXLINE_TEST_WALLET__?: TestWallet;
  }
}

export function WalletSession({
  onSession,
}: {
  onSession: (session: Session | null) => void;
}) {
  const wallet = useWallet();
  const { setVisible } = useWalletModal();
  const [testConnected, setTestConnected] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const testWallet =
    typeof window === "undefined" ? undefined : window.__TXLINE_TEST_WALLET__;
  const publicKey =
    (testConnected ? testWallet?.publicKey : undefined) ??
    wallet.publicKey?.toBase58();

  useEffect(() => {
    fetch("/api/auth/session")
      .then(async (response) =>
        response.ok ? ((await response.json()) as Session) : null,
      )
      .then((value) => {
        setSession(value);
        onSession(value);
      })
      .catch(() => undefined);
  }, [onSession]);

  async function signIn() {
    if (!publicKey) return;
    const signer = testWallet?.signMessage ?? wallet.signMessage;
    if (!signer) {
      setError("This wallet does not support signMessage.");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const challengeResponse = await fetch("/api/auth/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletPublicKey: publicKey }),
      });
      const challenge = (await challengeResponse.json()) as {
        nonce: string;
        issuedAt: string;
        expiresAt: string;
        message: string;
        error?: string;
      };
      if (!challengeResponse.ok) throw new Error(challenge.error);
      const signature = await signer(
        new TextEncoder().encode(challenge.message),
      );
      const verifyResponse = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletPublicKey: publicKey,
          nonce: challenge.nonce,
          issuedAt: challenge.issuedAt,
          expiresAt: challenge.expiresAt,
          signature: Buffer.from(signature).toString("base64"),
        }),
      });
      const result = (await verifyResponse.json()) as Session & {
        error?: string;
      };
      if (!verifyResponse.ok) throw new Error(result.error);
      setSession(result);
      onSession(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setSession(null);
    onSession(null);
  }

  return (
    <section className="feature-card" aria-labelledby="wallet-title">
      <h2 id="wallet-title">Wallet session</h2>
      {!publicKey ? (
        <button
          onClick={() => {
            if (testWallet) setTestConnected(true);
            else setVisible(true);
          }}
        >
          Connect wallet
        </button>
      ) : session ? (
        <>
          <p>Signed in as {session.walletPublicKey}</p>
          <button onClick={logout}>Log out</button>
        </>
      ) : (
        <>
          <p>{publicKey}</p>
          <button disabled={busy} onClick={signIn}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
