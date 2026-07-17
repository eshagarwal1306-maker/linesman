export type LoginMessageInput = {
  domain: string;
  walletPublicKey: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
};

export function buildLoginMessage(input: LoginMessageInput): string {
  return [
    `${input.domain} wants you to sign in with your Solana account:`,
    input.walletPublicKey,
    "",
    "Sign in to the TxLINE starter. This does not submit a transaction.",
    "",
    `Nonce: ${input.nonce}`,
    `Issued At: ${input.issuedAt}`,
    `Expiration Time: ${input.expiresAt}`,
  ].join("\n");
}
