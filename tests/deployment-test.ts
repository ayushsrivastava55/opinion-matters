import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PrivateMarkets } from "../target/types/private_markets";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

describe("Deployment Verification - Devnet", () => {
  // Configure the client to use devnet
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PrivateMarkets as Program<PrivateMarkets>;

  console.log("Program ID:", program.programId.toString());
  console.log("Cluster:", provider.connection.rpcEndpoint);

  it("Verifies program is deployed", async () => {
    const programInfo = await provider.connection.getAccountInfo(program.programId);
    console.log("✅ Program account exists");
    console.log("  Owner:", programInfo.owner.toString());
    console.log("  Executable:", programInfo.executable);
    console.log("  Data length:", programInfo.data.length);
  });

  it("Creates a simple market", async () => {
    // Create market authority
    const marketAuthority = Keypair.generate();
    
    // Airdrop SOL to market authority
    console.log("Requesting airdrop...");
    const signature = await provider.connection.requestAirdrop(
      marketAuthority.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(signature);
    console.log("✅ Airdrop confirmed");

    // Create collateral mint (USDC mock)
    console.log("Creating collateral mint...");
    const collateralMint = await createMint(
      provider.connection,
      marketAuthority,
      marketAuthority.publicKey,
      null,
      6 // USDC decimals
    );
    console.log("✅ Collateral mint created:", collateralMint.toString());

    // Derive market PDA
    const [marketPda, marketBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), marketAuthority.publicKey.toBuffer()],
      program.programId
    );
    console.log("Market PDA:", marketPda.toString());

    // Derive vault PDAs
    const [collateralVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("collateral_vault"), marketPda.toBuffer()],
      program.programId
    );

    const [feeVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("fee_vault"), marketPda.toBuffer()],
      program.programId
    );

    // Create outcome token mints
    console.log("Creating outcome token mints...");
    const yesMint = await createMint(
      provider.connection,
      marketAuthority,
      marketAuthority.publicKey,
      null,
      6
    );

    const noMint = await createMint(
      provider.connection,
      marketAuthority,
      marketAuthority.publicKey,
      null,
      6
    );
    console.log("✅ Outcome mints created");

    // Create market
    console.log("Creating market...");
    const currentTime = Math.floor(Date.now() / 1000);
    
    try {
      const tx = await program.methods
        .createMarket(
          "Will BTC reach $100k by EOY?",
          new anchor.BN(currentTime + 86400), // end_time: 24 hours from now
          100, // fee_bps: 1%
          new anchor.BN(3600), // batch_interval: 1 hour
          3, // resolver_quorum: 3 resolvers needed
        )
        .accounts({
          market: marketPda,
          authority: marketAuthority.publicKey,
          collateralMint: collateralMint,
          yesMint: yesMint,
          noMint: noMint,
          collateralVault: collateralVault,
          feeVault: feeVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([marketAuthority])
        .rpc();

      console.log("✅ Market created!");
      console.log("  Transaction:", tx);
      console.log("  Market PDA:", marketPda.toString());

      // Fetch and display market data
      const marketData = await program.account.market.fetch(marketPda);
      console.log("\n📊 Market Data:");
      console.log("  Description:", marketData.description);
      console.log("  End Time:", new Date(marketData.endTime.toNumber() * 1000).toISOString());
      console.log("  Batch Interval:", marketData.batchInterval.toString(), "seconds");
      console.log("  Resolver Quorum:", marketData.resolverQuorum);
      console.log("  Resolution State:", Object.keys(marketData.resolutionState)[0]);

    } catch (error) {
      console.error("❌ Error creating market:", error);
      throw error;
    }
  });
});
