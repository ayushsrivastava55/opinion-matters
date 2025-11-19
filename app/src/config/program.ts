import { PublicKey } from "@solana/web3.js";
import { getMXEAccAddress } from "@arcium-hq/client";

/**
 * Arcium-Powered Private Prediction Markets
 * Program Configuration
 */

// Program IDs (deployed via arcium deploy)
export const PROGRAM_ID = new PublicKey(
  "DkZ8hXcjyoYTWUDD4VZ35PXP2HHA6bF8XRmSQXoqrprW"
);

export const ARCIUM_PROGRAM_ID = new PublicKey(
  "Bv3Fb9VjzjWGfX18QTUcVycAfeLoQ5zZN6vv2g3cTZxp"
);

// Arcium MXE Account (Multi-party eXecution Environment)
// NOTE: SDK getMXEAccAddress() is buggy - hardcoding the actual on-chain address
// SDK derives: 2hxh9jHVDTAMJErBoQ5RhgB4jKWgikXb41nNCrGo9LEs (wrong!)
// Actual MXE created by arcium init-mxe: s3XWoMvzwCY93Fk5VNLDzyudNFQafoh1PwnABmscqSH
export const MXE_ACCOUNT = new PublicKey("34zXR49QSmNeuoH8LmoKgCJQo7vfATD57iD6Ubo2f5Pz");

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
