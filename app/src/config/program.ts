import { PublicKey } from "@solana/web3.js";
import { getMXEAccAddress } from "@arcium-hq/client";

/**
 * Arcium-Powered Private Prediction Markets
 * Program Configuration
 */

// Program IDs (fresh program with completed computation definitions)
export const PROGRAM_ID = new PublicKey(
  "3HS7xQrxt6dUHPH4H9bDqvs8N7g4smRoj29ZHUtrRpz4"
);

export const ARCIUM_PROGRAM_ID = new PublicKey(
  "Bv3Fb9VjzjWGfX18QTUcVycAfeLoQ5zZN6vv2g3cTZxp"
);

// Devnet cluster offset (v0.4.0) — use cluster 1 which has active nodes
export const ARCIUM_CLUSTER_OFFSET = 1;

// Arcium MXE Account (Multi-party eXecution Environment) - from fresh deployment
export const MXE_ACCOUNT = new PublicKey(
  "AUVCVt1aSWVmBVZtURjNpTYdGmqq8x8Tx4HPnX955SNd"
);

// Arcium System Accounts (Devnet)
export const ARCIUM_FEE_POOL = new PublicKey(
  "FeeP11qo1qoqVW16Y2RSgMNmD2cuwVqkLHt4B6QRjpC"
);

export const ARCIUM_CLOCK = new PublicKey(
  "C1ockAccount11111111111111111111111111111111"
);

// Network Configuration
export const NETWORK = "localnet";
export const RPC_ENDPOINT = "http://localhost:8899";

// PDA Seeds (must match Rust constants)
export const SEEDS = {
  MARKET: "market",
  VAULT: "vault",
  FEE_VAULT: "fee_vault",
  YES_MINT: "yes_mint",
  NO_MINT: "no_mint",
  RESOLVER: "resolver",
  BATCH: "batch",
  SIGN_PDA: "SignerAccount", // Must match Arcium SDK SIGN_PDA_SEED
} as const;

/**
 * Derive Arcium-specific PDAs
 */

export function deriveSignPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.SIGN_PDA)],
    PROGRAM_ID
  );
  return pda;
}

export function deriveCompDefPda(offset: number): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("computation_definition"),
      MXE_ACCOUNT.toBuffer(),
      Buffer.from(offset.toString().padStart(8, "0")),
    ],
    ARCIUM_PROGRAM_ID
  );
  return pda;
}

export function deriveMempoolPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("mempool"), MXE_ACCOUNT.toBuffer()],
    ARCIUM_PROGRAM_ID
  );
  return pda;
}

export function deriveExecpoolPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("execpool"), MXE_ACCOUNT.toBuffer()],
    ARCIUM_PROGRAM_ID
  );
  return pda;
}

export function deriveComputationPda(offset: number): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("computation"),
      MXE_ACCOUNT.toBuffer(),
      Buffer.from(new Uint8Array(new BigUint64Array([BigInt(offset)]).buffer)),
    ],
    ARCIUM_PROGRAM_ID
  );
  return pda;
}

export function deriveClusterPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("cluster"), MXE_ACCOUNT.toBuffer()],
    ARCIUM_PROGRAM_ID
  );
  return pda;
}

/**
 * Market-specific PDAs
 */

export function deriveMarketPda(authority: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.MARKET), authority.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

export function deriveVaultPda(market: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.VAULT), market.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

export function deriveResolverPda(
  market: PublicKey,
  resolver: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.RESOLVER), market.toBuffer(), resolver.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}
