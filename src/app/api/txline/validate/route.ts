import {
  AnchorProvider,
  Program,
  type Idl,
} from "@coral-xyz/anchor";
import BN from "bn.js";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSession } from "@/lib/auth/session";
import { getNetworkConfig } from "@/lib/network/config";
import { txlineFetch } from "@/lib/txline/client";
import devnetIdl from "@/lib/txline/idl/devnet.json";
import mainnetIdl from "@/lib/txline/idl/mainnet.json";
import { formatStatValidationProof } from "@/lib/txline/validation";

const requestSchema = z.object({
  network: z.enum(["devnet", "mainnet"]),
  fixtureId: z.number().int().positive(),
  seq: z.number().int().nonnegative(),
  statKeys: z.array(z.number().int().nonnegative()).min(1).max(8),
});

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const input = requestSchema.parse(await request.json());
    const search = new URLSearchParams({
      fixtureId: String(input.fixtureId),
      seq: String(input.seq),
      statKeys: input.statKeys.join(","),
    });
    const upstream = await txlineFetch(
      session.userId,
      input.network,
      `/api/scores/stat-validation?${search}`,
    );
    if (!upstream.ok) throw new Error(`Proof request failed (${upstream.status})`);
    const formatted = formatStatValidationProof(await upstream.json());
    if (
      input.statKeys.some(
        (key) => !formatted.statValues.some((stat) => stat.key === key),
      )
    ) {
      throw new Error("Incomplete stat coverage");
    }

    const config = getNetworkConfig(input.network);
    const idl = (input.network === "devnet" ? devnetIdl : mainnetIdl) as Idl;
    if (idl.address !== config.programId) throw new Error("IDL network mismatch");
    const viewer = Keypair.generate();
    const readOnlyWallet: ConstructorParameters<typeof AnchorProvider>[1] = {
      publicKey: viewer.publicKey,
      signTransaction: async (transaction) => transaction,
      signAllTransactions: async (transactions) => transactions,
    };
    const provider = new AnchorProvider(
      new Connection(config.rpcUrl, "confirmed"),
      readOnlyWallet,
      { commitment: "confirmed" },
    );
    const program = new Program(idl, provider);
    const epochDay = Math.floor(formatted.minTimestamp / 86_400_000);
    const [dailyScoresPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("daily_scores_roots"), new BN(epochDay).toBuffer("le", 2)],
      program.programId,
    );
    const valid = await program.methods
      .validateStatV2(formatted.payload, formatted.strategy)
      .accounts({ dailyScoresMerkleRoots: dailyScoresPda })
      .view();
    return NextResponse.json({
      valid,
      fixtureId: input.fixtureId,
      seq: input.seq,
      stats: formatted.statValues,
      timestamp: formatted.minTimestamp,
      epochDay,
      rootPda: dailyScoresPda.toBase58(),
      proofNodeCounts: formatted.proofNodeCounts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Validation failed";
    const category = message.startsWith("Malformed proof")
      ? "malformed_proof"
      : message.includes("Incomplete")
        ? "incomplete_stat_coverage"
        : message.toLowerCase().includes("root")
          ? "root_mismatch"
          : "validation_failed";
    return NextResponse.json({ error: message, category }, { status: 400 });
  }
}
