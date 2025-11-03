"use client"

import { Program, BN, type AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Transaction, Connection, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import {
  encryptTradeOrder,
  type TradeOrderPlaintext,
} from "./arcium-encryption-fixed";
import {
  getMXEAccAddress,
  getMempoolAccAddress,
  getExecutingPoolAccAddress,
  getComputationAccAddress,
  getCompDefAccAddress,
  getCompDefAccOffset,
  getClusterAccAddress,
} from "@arcium-hq/client";
import {
  PROGRAM_ID,
  deriveSignPda,
} from "./arcium-utils";

/**
 * Generate random bytes for computation offset
 */
function generateRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Submit a private trade using Arcium MPC
 * Following the Arcium blackjack example pattern
 */
export async function submitPrivateTrade(
  program: Program,
  connection: Connection,
  market: PublicKey,
  userPublicKey: PublicKey,
  side: "YES" | "NO",
  amount: number,
  maxPrice: number = 100 // Default max price in cents
): Promise<string> {
  // 1. Encrypt the order
  const orderPlaintext: TradeOrderPlaintext = {
    amount: BigInt(Math.floor(amount * 1_000_000)), // Scale to 6 decimals
    side: side === "YES",
    max_price: BigInt(maxPrice),
  };

  const provider = program.provider as AnchorProvider;
  const programId = program.programId;

  const encrypted = await encryptTradeOrder(provider, programId, orderPlaintext);

  // 2. Generate computation offset (8 random bytes)
  const computationOffsetBytes = generateRandomBytes(8);
  const computationOffset = new BN(computationOffsetBytes);

  // 3. Derive all required Arcium accounts using SDK helpers
  const [signPda] = deriveSignPda();
  const mxeAccount = getMXEAccAddress(programId);
  const mempoolAccount = getMempoolAccAddress(programId);
  const executingPool = getExecutingPoolAccAddress(programId);
  const computationAccount = getComputationAccAddress(programId, computationOffset);
  const compDefAccount = getCompDefAccAddress(
    programId,
    Buffer.from(getCompDefAccOffset("private_trade")).readUInt32LE()
  );
  // Use cluster offset 1078779259 (valid devnet cluster as per deployment)
  const clusterAccount = getClusterAccAddress(1078779259);

  // 4. Convert pub_key to Array (client_pubkey expected as [u8; 32])
  const pubKeyArray = Array.from(encrypted.pub_key);

  // Log account addresses for debugging
  console.log('🔍 Trade Submission Details:');
  console.log('  Market:', market.toBase58());
  console.log('  CompDef Account:', compDefAccount.toBase58());
  console.log('  MXE Account:', mxeAccount.toBase58());
  console.log('  Cluster Account:', clusterAccount.toBase58());
  console.log('  Computation Offset:', computationOffset.toString());

  // 5. Check if computation definition is initialized, and initialize if needed
  const compDefInfo = await connection.getAccountInfo(compDefAccount);
  if (!compDefInfo || compDefInfo.data.length === 0) {
    console.log("⚠️ Computation definition not initialized. Attempting to initialize...");
    try {
      await initializeComputationDefinition(
        program,
        connection,
        userPublicKey,
        "private_trade"
      );
      console.log("✅ Computation definition initialized successfully");
    } catch (initError: any) {
      console.error("Failed to initialize computation definition:", initError);
      throw new Error(
        `Computation definition not initialized. Please initialize it first: ${initError.message || initError}`
      );
    }
  }
  
  // 6. Build and send transaction
  // Fixed addresses from IDL
  const poolAccount = new PublicKey('7MGSS4iKNM4sVib7bDZDJhVqB6EcchPwVnTKenCY1jt3'); // Arcium pool account
  const arciumProgramId = new PublicKey('BKck65TgoKRokMjQM3datB9oRwJ8rAj2jxPXvHXUvcL6');
  
  try {
    const tx = await program.methods
      .submitPrivateTrade(
        computationOffset,
        // Encrypted order is a single [u8; 32] per IDL; use the commitment/ciphertext
        Array.from(encrypted.ciphertext_amount),
        pubKeyArray
      )
      .accountsPartial({
        market,
        payer: userPublicKey,
        signPdaAccount: signPda,
        mxeAccount,
        mempoolAccount,
        executingPool,
        computationAccount,
        compDefAccount,
        clusterAccount,
        poolAccount,
        clockAccount: SYSVAR_CLOCK_PUBKEY,
        systemProgram: SystemProgram.programId,
        arciumProgram: arciumProgramId,
      })
      .rpc({ commitment: "confirmed" });

    return tx;
  } catch (error: any) {
    console.error("Failed to submit private trade:", error);
    
    // Check if it's an AccountNotInitialized error for comp_def_account
    if (error.message?.includes("AccountNotInitialized") || 
        error.message?.includes("comp_def_account")) {
      throw new Error(
        `Computation definition account not initialized. ` +
        `The system attempted to initialize it automatically but failed. ` +
        `Please try again, or manually initialize using initializeComputationDefinition(). ` +
        `Error: ${error.message || error}`
      );
    }
    
    throw new Error(
      error.message ||
        "Failed to submit private trade. Please check the console for details."
    );
  }
}

/**
 * Simplified version for current frontend (without full Arcium account resolution)
 * This is a fallback that doesn't use MPC but still submits to the program
 */
export async function submitPrivateTradeSimplified(
  program: Program,
  market: PublicKey,
  userPublicKey: PublicKey,
  side: "YES" | "NO",
  amount: number
): Promise<string> {
  // Create a simple encrypted payload
  const orderData = {
    side,
    amount,
    slippage: 0.01,
  };

  const encoder = new TextEncoder();
  const payload = encoder.encode(JSON.stringify(orderData));

  // Pad to 32 bytes
  const paddedPayload = new Uint8Array(32);
  paddedPayload.set(payload.slice(0, 32));

  // Try to call with minimal accounts (this may fail if program requires all Arcium accounts)
  try {
    const tx = await (program.methods as any)
      .submitPrivateTrade(Array.from(paddedPayload))
      .accounts({
        market,
        user: userPublicKey,
      })
      .rpc();

    return tx;
  } catch (error: any) {
    console.error("Simplified trade submission failed:", error);
    throw new Error(
      "Unable to submit trade at this time. The privacy system is being configured. Please try again later."
    );
  }
}

/**
 * Check if Arcium computation definitions are initialized
 */
export async function checkComputationDefinitionsInitialized(
  connection: Connection,
  programId: PublicKey
): Promise<{
  privateTrade: boolean;
  batchClear: boolean;
  resolveMarket: boolean;
}> {
  const privateTradeCompDef = getCompDefAccAddress(
    programId,
    Buffer.from(getCompDefAccOffset("private_trade")).readUInt32LE()
  );
  const batchClearCompDef = getCompDefAccAddress(
    programId,
    Buffer.from(getCompDefAccOffset("batch_clear")).readUInt32LE()
  );
  const resolveMarketCompDef = getCompDefAccAddress(
    programId,
    Buffer.from(getCompDefAccOffset("resolve_market")).readUInt32LE()
  );

  const [privateTradeInfo, batchClearInfo, resolveMarketInfo] = await Promise.all([
    connection.getAccountInfo(privateTradeCompDef),
    connection.getAccountInfo(batchClearCompDef),
    connection.getAccountInfo(resolveMarketCompDef),
  ]);

  return {
    privateTrade: privateTradeInfo !== null,
    batchClear: batchClearInfo !== null,
    resolveMarket: resolveMarketInfo !== null,
  };
}

/**
 * Initialize a computation definition account if it doesn't exist
 * This allows users to initialize the account when needed from the frontend
 */
export async function initializeComputationDefinition(
  program: Program,
  connection: Connection,
  userPublicKey: PublicKey,
  compDefType: "private_trade" | "batch_clear" | "resolve_market"
): Promise<{ initialized: boolean; tx?: string }> {
  const programId = program.programId;
  const arciumProgramId = new PublicKey('BKck65TgoKRokMjQM3datB9oRwJ8rAj2jxPXvHXUvcL6');
  
  // Derive the computation definition account
  const compDefAccount = getCompDefAccAddress(
    programId,
    Buffer.from(getCompDefAccOffset(compDefType)).readUInt32LE()
  );
  const mxeAccount = getMXEAccAddress(programId);

  // Check if already initialized
  const accountInfo = await connection.getAccountInfo(compDefAccount);
  if (accountInfo && accountInfo.data.length > 0) {
    console.log(`✅ ${compDefType} computation definition already initialized`);
    return { initialized: false };
  }

  console.log(`🔧 Initializing ${compDefType} computation definition...`);

  try {
    let tx: string;

    // Call the appropriate initialization method based on type
    if (compDefType === "private_trade") {
      tx = await program.methods
        .initPrivateTradeCompDef()
        .accounts({
          payer: userPublicKey,
          mxeAccount,
          compDefAccount,
          arciumProgram: arciumProgramId,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ commitment: "confirmed" });
    } else if (compDefType === "batch_clear") {
      tx = await program.methods
        .initBatchClearCompDef()
        .accounts({
          payer: userPublicKey,
          mxeAccount,
          compDefAccount,
          arciumProgram: arciumProgramId,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ commitment: "confirmed" });
    } else if (compDefType === "resolve_market") {
      tx = await program.methods
        .initResolveMarketCompDef()
        .accounts({
          payer: userPublicKey,
          mxeAccount,
          compDefAccount,
          arciumProgram: arciumProgramId,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ commitment: "confirmed" });
    } else {
      throw new Error(`Unknown computation definition type: ${compDefType}`);
    }

    console.log(`✅ ${compDefType} computation definition initialized! Tx: ${tx}`);
    return { initialized: true, tx };
  } catch (error: any) {
    console.error(`❌ Failed to initialize ${compDefType}:`, error);
    throw new Error(
      `Failed to initialize ${compDefType} computation definition: ${error.message || error}`
    );
  }
}

/**
 * Initialize all computation definitions if they don't exist
 * Useful for ensuring all required accounts are set up
 */
export async function initializeAllComputationDefinitions(
  program: Program,
  connection: Connection,
  userPublicKey: PublicKey
): Promise<{
  privateTrade: { initialized: boolean; tx?: string };
  batchClear: { initialized: boolean; tx?: string };
  resolveMarket: { initialized: boolean; tx?: string };
}> {
  const results = {
    privateTrade: { initialized: false as boolean },
    batchClear: { initialized: false as boolean },
    resolveMarket: { initialized: false as boolean },
  };

  // Initialize sequentially to avoid rate limiting
  try {
    results.privateTrade = await initializeComputationDefinition(
      program,
      connection,
      userPublicKey,
      "private_trade"
    );
  } catch (error: any) {
    console.error("Failed to initialize private_trade:", error);
  }

  try {
    results.batchClear = await initializeComputationDefinition(
      program,
      connection,
      userPublicKey,
      "batch_clear"
    );
  } catch (error: any) {
    console.error("Failed to initialize batch_clear:", error);
  }

  try {
    results.resolveMarket = await initializeComputationDefinition(
      program,
      connection,
      userPublicKey,
      "resolve_market"
    );
  } catch (error: any) {
    console.error("Failed to initialize resolve_market:", error);
  }

  return results;
}
