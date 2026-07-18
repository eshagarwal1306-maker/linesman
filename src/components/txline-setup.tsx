"use client";

import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";

import { useNetwork } from "@/components/app-providers";
import { getNetworkConfig } from "@/lib/network/config";
import { signActivationMessage } from "@/lib/txline/sign-activation";
import { subscribeFreeTier } from "@/lib/txline/subscription";

type SetupState = "guest_created" | "subscribed" | "activated" | null;

function isConsumedSubscriptionError(message: string): boolean {
  return /already been used to activate/i.test(message);
}

export function TxlineSetup({
  authenticated,
  onReady,
  onBusy,
}: {
  authenticated: boolean;
  onReady: (ready: boolean) => void;
  onBusy: (busy: boolean) => void;
}) {
  const { network } = useNetwork();
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const walletAdapter = useWallet();
  const [state, setState] = useState<SetupState>(null);
  const [serviceLevelId, setServiceLevelId] = useState(1);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authenticated) return;
    fetch(`/api/txline/setup/status?network=${network}`)
      .then(async (response) =>
        response.ok
          ? ((await response.json()) as {
              state: SetupState;
              serviceLevelId?: number;
            })
          : null,
      )
      .then((status) => {
        setState(status?.state ?? null);
        if (status?.serviceLevelId) setServiceLevelId(status.serviceLevelId);
        onReady(status?.state === "activated");
      })
      .catch(() => undefined);
  }, [authenticated, network, onReady]);

  async function ensureGuestCredential(): Promise<void> {
    const response = await fetch("/api/txline/setup/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ network }),
    });
    if (!response.ok) throw new Error("Could not create guest credential");
    setState("guest_created");
  }

  async function resetForFreshSubscribe(): Promise<void> {
    const response = await fetch("/api/txline/setup/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ network, renewGuest: true }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      throw new Error(result.error ?? "Could not reset TxLINE setup");
    }
    setState("guest_created");
  }

  async function activateWithSignature(txSignature: string): Promise<void> {
    const testWallet = (
      window as unknown as {
        __TXLINE_TEST_WALLET__?: {
          publicKey?: string;
          signMessage: (message: Uint8Array) => Promise<Uint8Array>;
        };
      }
    ).__TXLINE_TEST_WALLET__;
    const signer = testWallet?.signMessage ?? walletAdapter.signMessage;
    if (!signer) {
      throw new Error("A compatible wallet with signMessage is required.");
    }

    const messageResponse = await fetch(
      "/api/txline/setup/activation-message",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ network, txSignature, serviceLevelId }),
      },
    );
    const messageResult = (await messageResponse.json()) as {
      message?: string;
      error?: string;
    };
    if (!messageResponse.ok || !messageResult.message) {
      throw new Error(messageResult.error ?? "Activation message unavailable");
    }
    setState("subscribed");

    const walletPublicKey =
      walletAdapter.publicKey?.toBase58() ?? testWallet?.publicKey;
    if (!walletPublicKey) throw new Error("Connect a wallet first");

    const walletSignature = await signActivationMessage({
      message: messageResult.message,
      walletPublicKey,
      signMessage: signer,
    });
    const activation = await fetch("/api/txline/setup/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ network, walletSignature }),
    });
    const activationResult = (await activation.json()) as {
      error?: string;
    };
    if (!activation.ok) {
      throw new Error(activationResult.error ?? "TxLINE activation failed");
    }
    setState("activated");
    onReady(true);
  }

  async function subscribeAndActivate(): Promise<void> {
    const testWallet = (
      window as unknown as {
        __TXLINE_TEST_WALLET__?: {
          subscribe?: () => Promise<string>;
        };
      }
    ).__TXLINE_TEST_WALLET__;

    let txSignature: string;
    if (testWallet?.subscribe) {
      txSignature = await testWallet.subscribe();
    } else {
      if (!wallet) throw new Error("Connect a wallet first");
      txSignature = await subscribeFreeTier({
        network,
        serviceLevelId,
        connection,
        wallet,
      });
    }
    await activateWithSignature(txSignature);
  }

  async function setup() {
    const signer =
      (
        window as unknown as {
          __TXLINE_TEST_WALLET__?: {
            signMessage: (message: Uint8Array) => Promise<Uint8Array>;
          };
        }
      ).__TXLINE_TEST_WALLET__?.signMessage ?? walletAdapter.signMessage;
    if (!signer) {
      setError("A compatible wallet with signMessage is required.");
      return;
    }
    setBusy(true);
    onBusy(true);
    setError(undefined);
    try {
      let current = state;
      if (!current) {
        await ensureGuestCredential();
        current = "guest_created";
      }

      if (current === "guest_created") {
        await subscribeAndActivate();
        return;
      }

      // Resume from a prior subscribe. If that tx was already activated on
      // TxLINE (but not saved locally), fall back to a fresh subscribe.
      const status = (await fetch(
        `/api/txline/setup/status?network=${network}`,
      ).then((response) => response.json())) as { txSignature?: string };
      if (!status.txSignature) throw new Error("Subscription signature missing");

      try {
        await activateWithSignature(status.txSignature);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "";
        if (!isConsumedSubscriptionError(message)) throw cause;
        await resetForFreshSubscribe();
        await subscribeAndActivate();
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Setup failed";
      if (/reject|cancel|user denied/i.test(message)) {
        setError("Wallet request was rejected. Click Set up TxLINE to retry.");
      } else if (isConsumedSubscriptionError(message)) {
        setError(
          "That subscription was already activated. Click Set up TxLINE again to create a fresh one.",
        );
        void resetForFreshSubscribe().catch(() => undefined);
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }

  return (
    <section className="feature-card" aria-labelledby="setup-title">
      <h2 id="setup-title">TxLINE setup</h2>
      <ol className="setup-steps">
        <li data-complete={state !== null}>Guest credential</li>
        <li data-complete={state === "subscribed" || state === "activated"}>
          On-chain subscription
        </li>
        <li data-complete={state === "activated"}>Activation signature</li>
        <li data-complete={state === "activated"}>Ready</li>
      </ol>
      {network === "mainnet" && (
        <label>
          Service level
          <select
            disabled={busy || state === "activated"}
            value={serviceLevelId}
            onChange={(event) => setServiceLevelId(Number(event.target.value))}
          >
            {getNetworkConfig(network).serviceLevels.map((level) => (
              <option value={level} key={level}>
                {level}
              </option>
            ))}
          </select>
        </label>
      )}
      {state === "activated" ? (
        <p className="success">TxLINE ready</p>
      ) : (
        <button disabled={!authenticated || busy} onClick={() => void setup()}>
          {busy ? "Setting up…" : "Set up TxLINE"}
        </button>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
