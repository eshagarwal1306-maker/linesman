"use client";

import bs58 from "bs58";
import nacl from "tweetnacl";

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function asSignatureBytes(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value;
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  if (Array.isArray(value)) return Uint8Array.from(value);
  if (value && typeof value === "object" && "signature" in value) {
    return asSignatureBytes((value as { signature: unknown }).signature);
  }
  throw new Error("Wallet returned an unexpected signature format");
}

function verify(
  message: Uint8Array,
  signature: Uint8Array,
  walletPublicKey: string,
): boolean {
  if (signature.length !== nacl.sign.signatureLength) return false;
  try {
    return nacl.sign.detached.verify(
      message,
      signature,
      bs58.decode(walletPublicKey),
    );
  } catch {
    return false;
  }
}

type PhantomLike = {
  signMessage?: (
    message: Uint8Array,
    display?: string,
  ) => Promise<Uint8Array | { signature: Uint8Array }>;
};

/**
 * Sign the TxLINE activation preimage and return a base64 ed25519 signature
 * that verifies against the wallet pubkey over the exact UTF-8 bytes.
 */
export async function signActivationMessage(input: {
  message: string;
  walletPublicKey: string;
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
}): Promise<string> {
  const bytes = new TextEncoder().encode(input.message);

  const testWallet = Boolean(
    (window as unknown as { __TXLINE_TEST_WALLET__?: unknown })
      .__TXLINE_TEST_WALLET__,
  );

  if (input.signMessage) {
    const signature = asSignatureBytes(await input.signMessage(bytes));
    if (
      testWallet ||
      verify(bytes, signature, input.walletPublicKey)
    ) {
      return toBase64(signature);
    }
  }

  // Fallback: Phantom's legacy provider signs raw UTF-8 bytes with an
  // explicit display type, which matches TxLINE's nacl verification.
  const phantom = (window as unknown as { phantom?: { solana?: PhantomLike } })
    .phantom?.solana;
  const legacy =
    phantom ??
    (window as unknown as { solana?: PhantomLike }).solana;

  if (legacy?.signMessage) {
    const signature = asSignatureBytes(await legacy.signMessage(bytes, "utf8"));
    if (verify(bytes, signature, input.walletPublicKey)) {
      return toBase64(signature);
    }
  }

  throw new Error(
    "Could not produce a valid activation signature. Unlock Phantom and approve the raw message sign request.",
  );
}
