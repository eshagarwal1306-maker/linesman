/**
 * scripts/verify-cli.ts
 *
 * Headless demonstration of the same on-chain `validateStatV2` check the
 * "Verify on-chain" button runs in the browser — proving the trust chain
 * doesn't depend on the Next.js app at all. This is the seed of a keeper
 * bot / CPI settlement engine: point it at a fixture, it queries TxLINE for
 * a Merkle proof of the proven score, then asks Solana to confirm that
 * proof against the on-chain daily root, with zero UI involved.
 *
 * Usage:
 *   TXLINE_JWT=... TXLINE_API_TOKEN=... pnpm verify -- --fixture 12345 --seq 0 --stats 0,1
 *
 * Env vars:
 *   TXLINE_JWT         Guest or subscribed JWT for the TxLINE REST API.
 *   TXLINE_API_TOKEN   API token issued once setup is "activated".
 *   NETWORK            "devnet" (default) | "mainnet"
 *
 * All three credentials are already sitting in this project's `txline_credentials`
 * table (server-side, encrypted) once a wallet finishes /starter — this script
 * intentionally takes them as plain env vars instead of touching the DB so it
 * can run completely outside the Next.js server/client boundary.
 */
import "dotenv/config";
import { AnchorProvider, Program, type Idl } from "@coral-xyz/anchor";
import BN from "bn.js";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

import { getNetworkConfig, type Network } from "../src/lib/network/config";
import devnetIdl from "../src/lib/txline/idl/devnet.json";
import mainnetIdl from "../src/lib/txline/idl/mainnet.json";
import {
  assertProofMatchesRequest,
  formatStatValidationProof,
  validationComputeBudgetInstruction,
} from "../src/lib/txline/validation";

function parseArgs(): { fixtureId: number; seq: number; statKeys: number[] } {
  const args = process.argv.slice(2);
  const get = (flag: string, fallback: string) => {
    const index = args.indexOf(flag);
    return index === -1 ? fallback : args[index + 1];
  };
  return {
    fixtureId: Number(get("--fixture", "0")),
    seq: Number(get("--seq", "0")),
    statKeys: get("--stats", "0,1").split(",").map(Number),
  };
}

async function main() {
  const jwt = process.env.TXLINE_JWT;
  const apiToken = process.env.TXLINE_API_TOKEN;
  const network = (process.env.NETWORK ?? "devnet") as Network;
  if (!jwt || !apiToken) {
    console.error("Missing TXLINE_JWT / TXLINE_API_TOKEN env vars. See scripts/verify-cli.ts header for usage.");
    process.exit(1);
  }

  const { fixtureId, seq, statKeys } = parseArgs();
  if (!fixtureId) {
    console.error("Pass a real numeric TxLINE fixture id: --fixture <id>");
    process.exit(1);
  }

  const config = getNetworkConfig(network);
  console.log(`[verify-cli] network=${network} fixture=${fixtureId} seq=${seq} stats=${statKeys.join(",")}`);

  console.log("[verify-cli] requesting stat-validation proof from TxLINE…");
  const search = new URLSearchParams({ fixtureId: String(fixtureId), seq: String(seq), statKeys: statKeys.join(",") });
  const upstream = await fetch(new URL(`/api/scores/stat-validation?${search}`, config.apiOrigin), {
    headers: { Authorization: `Bearer ${jwt}`, "X-Api-Token": apiToken },
  });
  if (!upstream.ok) {
    throw new Error(`TxLINE proof request failed: ${upstream.status} ${await upstream.text()}`);
  }
  const formatted = formatStatValidationProof(await upstream.json());
  assertProofMatchesRequest(formatted, fixtureId, statKeys);
  console.log(`[verify-cli] proof received — ${formatted.proofNodeCounts.stats.length} stat(s), main tree depth ${formatted.proofNodeCounts.main}`);

  const idl = (network === "devnet" ? devnetIdl : mainnetIdl) as Idl;
  if (idl.address !== config.programId) throw new Error("IDL network mismatch");

  const viewer = Keypair.generate();
  const provider = new AnchorProvider(
    new Connection(config.rpcUrl, "confirmed"),
    {
      publicKey: viewer.publicKey,
      signTransaction: async (tx) => tx,
      signAllTransactions: async (txs) => txs,
    },
    { commitment: "confirmed" },
  );
  const program = new Program(idl, provider);
  const epochDay = Math.floor(formatted.minTimestamp / 86_400_000);
  const [dailyScoresPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("daily_scores_roots"), new BN(epochDay).toBuffer("le", 2)],
    program.programId,
  );

  console.log(`[verify-cli] querying Solana ${network} — daily root PDA ${dailyScoresPda.toBase58()}…`);
  const valid = await program.methods
    .validateStatV2(formatted.payload, formatted.strategy)
    .preInstructions([validationComputeBudgetInstruction()])
    .accounts({ dailyScoresMerkleRoots: dailyScoresPda })
    .view();

  console.log("");
  console.log(valid ? "✓ VERIFIED — on-chain root confirms this stat set." : "✗ NOT VERIFIED — on-chain root did not confirm this stat set.");
  console.log(`  epoch day:      ${epochDay}`);
  console.log(`  root account:   ${dailyScoresPda.toBase58()}`);
  console.log(`  explorer:       https://explorer.solana.com/address/${dailyScoresPda.toBase58()}${network === "mainnet" ? "" : "?cluster=devnet"}`);
  console.log(`  stats checked:  ${formatted.statValues.map((s) => `key=${s.key} value=${s.value}`).join(", ")}`);
}

main().catch((error) => {
  console.error("[verify-cli] failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
