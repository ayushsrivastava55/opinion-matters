"use client"

import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { PROGRAM_ID as CONFIG_PROGRAM_ID } from "../config/program";

/**
 * Arcium MPC Utilities for Frontend Integration
 * Provides PDA derivations and helper functions for interacting with Arcium-powered program
 */

// Program IDs - Import from config to ensure consistency
// Re-export program ID from config
export const PROGRAM_ID = CONFIG_PROGRAM_ID;

export const ARCIUM_PROGRAM_ID = new PublicKey(
  "Bv3Fb9VjzjWGfX18QTUcVycAfeLoQ5zZN6vv2g3cTZxp"
);

// Arcium MXE Account - Derived dynamically using Arcium SDK
// This is no longer needed as we use getMXEAccAddress(programId) directly

// Arcium System Accounts (Devnet)
// FeePool for Arcium program Bv3Fb9VjzjWGfX18QTUcVycAfeLoQ5zZN6vv2g3cTZxp, cluster offset 1
// Derived using getFeePoolAccAddress(1) from @arcium-hq/client SDK
export const ARCIUM_FEE_POOL = new PublicKey(
  "FsWbPQcJQ2cCyr9ndse13fDqds4F2Ezx2WgTL25Dke4M"
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

export function deriveSignPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.SIGN_PDA)],
    PROGRAM_ID
  );
}

// Note: MXE account derivation may need special handling
// For now, we'll provide helper functions for other PDAs

/**
 * Market-specific PDAs
 */

export function deriveMarketPda(authority: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.MARKET), authority.toBuffer()],
    PROGRAM_ID
  );
}

export function deriveVaultPda(market: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.VAULT), market.toBuffer()],
    PROGRAM_ID
  );
}

export function deriveFeeVaultPda(market: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.FEE_VAULT), market.toBuffer()],
    PROGRAM_ID
  );
}

export function deriveResolverPda(
  market: PublicKey,
  resolver: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.RESOLVER), market.toBuffer(), resolver.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Generate a random computation offset for Arcium computations
 */
export function generateComputationOffset(): BN {
  // Generate a random offset between 0 and 1,000,000
  const randomOffset = Math.floor(Math.random() * 1_000_000);
  return new BN(randomOffset);
}

/**
 * Encrypt order data for private trade submission
 * This is a placeholder - actual encryption should use Arcium SDK
 */
export function encryptOrderData(
  amount: number,
  side: "YES" | "NO",
  maxPrice: number
): {
  encryptedOrder: Uint8Array;
  clientPubkey: Uint8Array;
} {
  // TODO: Implement actual Arcium encryption
  // For now, return mock encrypted data
  const orderData = {
    amount,
    side: side === "YES" ? 1 : 0,
    maxPrice,
  };

  // Create a buffer with the order data (this should be encrypted in production)
  const dataStr = JSON.stringify(orderData);
  const encoder = new TextEncoder();
  const encryptedOrder = encoder.encode(dataStr);

  // Pad to 32 bytes
  const paddedOrder = new Uint8Array(32);
  paddedOrder.set(encryptedOrder.slice(0, 32));

  // Generate a mock client pubkey (in production, this comes from Arcium SDK)
  const clientPubkey = new Uint8Array(32);
  crypto.getRandomValues(clientPubkey);

  return {
    encryptedOrder: paddedOrder,
    clientPubkey,
  };
}

/**
 * Helper to check if wallet is connected
 */
export function isWalletConnected(publicKey: PublicKey | null): publicKey is PublicKey {
  return publicKey !== null;
}

/**
 * Format pubkey for display
 */
export function formatPubkey(pubkey: PublicKey | string, chars: number = 4): string {
  const str = typeof pubkey === "string" ? pubkey : pubkey.toString();
  return `${str.slice(0, chars)}...${str.slice(-chars)}`;
}
