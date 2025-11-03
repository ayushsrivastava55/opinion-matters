import { PublicKey } from "@solana/web3.js";
import { getMXEAccAddress } from "@arcium-hq/client";

/**
 * Arcium-Powered Private Prediction Markets
 * Program Configuration
 */

// Program IDs
export const PROGRAM_ID = new PublicKey(
  "AjSL49GvLcfvarTXBcTX1fk9WqxH6LFVLpWnh8bgGtnK"
);

export const ARCIUM_PROGRAM_ID = new PublicKey(
  "Arc1umF1yAXzJJaQheFMv3dJ34P6GYmr3yFetbGWJX6"
);

// Arcium MXE Account (Multi-party eXecution Environment)
// Derived dynamically from PROGRAM_ID using Arcium SDK
export const MXE_ACCOUNT = getMXEAccAddress(PROGRAM_ID);

// Arcium System Accounts (Devnet)
export const ARCIUM_FEE_POOL = new PublicKey(
  "FeeP11qo1qoqVW16Y2RSgMNmD2cuwVqkLHt4B6QRjpC"
);

export const ARCIUM_CLOCK = new PublicKey(
  "C1ockAccount11111111111111111111111111111111"
);

// Computation Definition Offsets
export const COMP_DEF_OFFSETS = {
  PRIVATE_TRADE: 1000,
  BATCH_CLEAR: 2000,
  RESOLVE_MARKET: 3000,
} as const;

// Network Configuration
export const NETWORK = "devnet";
export const RPC_ENDPOINT = "https://api.devnet.solana.com";

// PDA Seeds (must match Rust constants)
export const SEEDS = {
  MARKET: "market",
  VAULT: "vault",
  FEE_VAULT: "fee_vault",
  YES_MINT: "yes_mint",
  NO_MINT: "no_mint",
  RESOLVER: "resolver",
  BATCH: "batch",
  SIGN_PDA: "sign_pda",
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
