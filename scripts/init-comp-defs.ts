import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PrivateMarkets } from "../target/types/private_markets";
import { PublicKey } from "@solana/web3.js";

/**
 * Initialize Arcium MPC Computation Definitions
 *
 * This script initializes the three encrypted computation definitions:
 * 1. private_trade - Private CFMM order execution
 * 2. batch_clear - Encrypted batch auction clearing
 * 3. resolve_market - Private market resolution
 */

// Arcium Program ID (mainnet/devnet)
const ARCIUM_PROGRAM_ID = new PublicKey("Arc1umF1yAXzJJaQheFMv3dJ34P6GYmr3yFetbGWJX6");

// MXE Account from deployment
const MXE_ACCOUNT = new PublicKey("35ee2NU9kRUojphAuHvaPX2YamVUmTZCgcy8LzDmpZqN3ugQ9Dv48BPeZgdgpYy98yRg5aoFeeoqVxmNHigJ8MZw");

// Computation definition offsets (must match constants.rs and Arcium.toml)
const COMP_DEF_OFFSET_PRIVATE_TRADE = 1000;
const COMP_DEF_OFFSET_BATCH_CLEAR = 2000;
const COMP_DEF_OFFSET_RESOLVE_MARKET = 3000;

async function main() {
  // Configure the client to use devnet
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PrivateMarkets as Program<PrivateMarkets>;

  console.log("🚀 Initializing Arcium Computation Definitions");
  console.log("================================================");
  console.log("Program ID:", program.programId.toString());
  console.log("MXE Account:", MXE_ACCOUNT.toString());
  console.log("Cluster:", provider.connection.rpcEndpoint);
  console.log("Payer:", provider.wallet.publicKey.toString());
  console.log();

  // Derive computation definition PDAs
  const privateTradeCompDef = deriveCompDefPda(COMP_DEF_OFFSET_PRIVATE_TRADE);
  const batchClearCompDef = deriveCompDefPda(COMP_DEF_OFFSET_BATCH_CLEAR);
  const resolveMarketCompDef = deriveCompDefPda(COMP_DEF_OFFSET_RESOLVE_MARKET);

  console.log("📍 Computation Definition PDAs:");
  console.log("  private_trade:", privateTradeCompDef.toString());
  console.log("  batch_clear:", batchClearCompDef.toString());
  console.log("  resolve_market:", resolveMarketCompDef.toString());
  console.log();

  // Initialize private_trade computation definition
  await initializeCompDef(
    program,
    provider,
    "private_trade",
    privateTradeCompDef,
    "initPrivateTradeCompDef"
  );

  // Initialize batch_clear computation definition
  await initializeCompDef(
    program,
    provider,
    "batch_clear",
    batchClearCompDef,
    "initBatchClearCompDef"
  );

  // Initialize resolve_market computation definition
  await initializeCompDef(
    program,
    provider,
    "resolve_market",
    resolveMarketCompDef,
    "initResolveMarketCompDef"
  );

  console.log();
  console.log("✅ All computation definitions initialized successfully!");
  console.log("📝 Next steps:");
  console.log("  1. Test private trade submission");
  console.log("  2. Test batch order submission");
  console.log("  3. Test resolver attestation submission");
}

async function initializeCompDef(
  program: Program<PrivateMarkets>,
  provider: anchor.AnchorProvider,
  name: string,
  compDefPda: PublicKey,
  methodName: string
) {
  console.log(`🔧 Initializing ${name} computation definition...`);

  // Check if already initialized
  try {
    const accountInfo = await provider.connection.getAccountInfo(compDefPda);
    if (accountInfo && accountInfo.data.length > 0) {
      console.log(`  ⏭️  ${name} already initialized, skipping...`);
      return;
    }
  } catch (error) {
    // Account doesn't exist yet, proceed with initialization
  }

  try {
    let tx: string;

    // Call the appropriate method based on name
    // Note: arciumProgram and systemProgram are auto-resolved by Arcium macros
    if (methodName === "initPrivateTradeCompDef") {
      tx = await program.methods.initPrivateTradeCompDef()
        .accounts({
          payer: provider.wallet.publicKey,
          mxeAccount: MXE_ACCOUNT,
          compDefAccount: compDefPda,
        })
        .rpc();
    } else if (methodName === "initBatchClearCompDef") {
      tx = await program.methods.initBatchClearCompDef()
        .accounts({
          payer: provider.wallet.publicKey,
          mxeAccount: MXE_ACCOUNT,
          compDefAccount: compDefPda,
        })
        .rpc();
    } else if (methodName === "initResolveMarketCompDef") {
      tx = await program.methods.initResolveMarketCompDef()
        .accounts({
          payer: provider.wallet.publicKey,
          mxeAccount: MXE_ACCOUNT,
          compDefAccount: compDefPda,
        })
        .rpc();
    } else {
      throw new Error(`Unknown method: ${methodName}`);
    }

    console.log(`  ✅ ${name} initialized!`);
    console.log(`     Tx: ${tx}`);
  } catch (error: any) {
    console.error(`  ❌ Error initializing ${name}:`, error.message || error);
    throw error;
  }
}

function deriveCompDefPda(offset: number): PublicKey {
  // Derive the computation definition PDA using Arcium's derivation logic
  // This matches the derive_comp_def_pda!() macro in the Rust code
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("computation_definition"),
      MXE_ACCOUNT.toBuffer(),
      Buffer.from(offset.toString().padStart(8, '0'))
    ],
    ARCIUM_PROGRAM_ID
  );
  return pda;
}

main()
  .then(() => {
    console.log("\n🎉 Initialization complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Initialization failed:", error);
    process.exit(1);
  });
