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
import { assert } from "chai";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("private-markets", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.PrivateMarkets as Program<PrivateMarkets>;
  const provider = anchor.getProvider();

  let collateralMint: PublicKey;
  let marketAuthority: Keypair;
  let marketPda: PublicKey;
  let collateralVault: PublicKey;
  let feeVault: PublicKey;
  let yesMint: PublicKey;
  let noMint: PublicKey;

  before(async () => {
    // Create market authority
    marketAuthority = Keypair.generate();
    
    // Airdrop SOL to market authority
    const signature = await provider.connection.requestAirdrop(
      marketAuthority.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(signature);

    // Create collateral mint (USDC mock)
    collateralMint = await createMint(
      provider.connection,
      marketAuthority,
      marketAuthority.publicKey,
      null,
      6 // USDC decimals
    );

    console.log("Collateral mint:", collateralMint.toString());
  });

  it("Creates a prediction market", async () => {
    const question = "Will ETH hit $5000 by EOY 2025?";
    const endTime = new anchor.BN(Math.floor(Date.now() / 1000) + 86400 * 30); // 30 days from now
    const feeBps = 100; // 1%
    const batchInterval = new anchor.BN(3600); // 1 hour
    const resolverQuorum = 3;

    // Derive PDAs
    [marketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), marketAuthority.publicKey.toBuffer()],
      program.programId
    );

    [collateralVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), marketPda.toBuffer()],
      program.programId
    );

    [feeVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("fee_vault"), marketPda.toBuffer()],
      program.programId
    );

    [yesMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("yes_mint"), marketPda.toBuffer()],
      program.programId
    );

    [noMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("no_mint"), marketPda.toBuffer()],
      program.programId
    );

    // Create market
    const tx = await program.methods
      .createMarket(question, endTime, feeBps, batchInterval, resolverQuorum)
      .accounts({
        market: marketPda,
        collateralVault,
        feeVault,
        yesMint,
        noMint,
        collateralMint,
        authority: marketAuthority.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([marketAuthority])
      .rpc();

    console.log("Market created:", tx);

    // Fetch and verify market state
    const marketAccount = await program.account.market.fetch(marketPda);
    assert.equal(marketAccount.question, question);
    assert.equal(marketAccount.feeBps, feeBps);
    assert.equal(marketAccount.resolverQuorum, resolverQuorum);
    assert.equal(marketAccount.resolverCount, 0);
    assert.equal(marketAccount.attestationCount, 0);
    assert.equal(marketAccount.finalOutcome, 255); // Unresolved

    console.log("Market state verified");
  });

  it("Deposits collateral", async () => {
    const user = Keypair.generate();
    
    // Airdrop SOL to user
    const signature = await provider.connection.requestAirdrop(
      user.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(signature);

    // Create user token account and mint collateral
    const userCollateral = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      user,
      collateralMint,
      user.publicKey
    );

    await mintTo(
      provider.connection,
      marketAuthority,
      collateralMint,
      userCollateral.address,
      marketAuthority,
      1000 * 1e6 // 1000 USDC
    );

    // Deposit collateral
    const depositAmount = new anchor.BN(100 * 1e6); // 100 USDC
    const tx = await program.methods
      .depositCollateral(depositAmount)
      .accounts({
        market: marketPda,
        collateralVault,
        userCollateral: userCollateral.address,
        user: user.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

    console.log("Collateral deposited:", tx);

    // Verify vault balance
    const vaultAccount = await provider.connection.getTokenAccountBalance(
      collateralVault
    );
    assert.equal(vaultAccount.value.uiAmount, 100);

    console.log("Vault balance verified:", vaultAccount.value.uiAmount);
  });

  it("Submits a private trade order", async () => {
    const user = Keypair.generate();
    
    // Airdrop SOL
    const signature = await provider.connection.requestAirdrop(
      user.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(signature);

    // Mock encrypted order (in production, this would be encrypted via Arcium SDK)
    const encryptedOrder = Buffer.from(
      JSON.stringify({
        side: "YES",
        amount: 50,
        slippage: 0.01,
      })
    );

    const tx = await program.methods
      .submitPrivateTrade(encryptedOrder)
      .accounts({
        market: marketPda,
        user: user.publicKey,
      })
      .signers([user])
      .rpc();

    console.log("Private trade submitted:", tx);
  });

  it("Submits a batch order", async () => {
    const user = Keypair.generate();

    // Airdrop SOL
    const signature = await provider.connection.requestAirdrop(
      user.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(signature);

    // Mock order commitment (hash of encrypted order)
    const orderCommitment = Buffer.alloc(32);
    orderCommitment.fill(1);

    const tx = await program.methods
      .submitBatchOrder(Array.from(orderCommitment))
      .accounts({
        market: marketPda,
        user: user.publicKey,
      })
      .signers([user])
      .rpc();

    console.log("Batch order submitted:", tx);

    // Verify batch order count
    const marketAccount = await program.account.market.fetch(marketPda);
    assert.equal(marketAccount.batchOrderCount, 1);
  });

  it("Only begins resolution after distinct resolvers reach quorum", async () => {
    const resolutionAuthority = Keypair.generate();
    const quorum = 2;
    const endTime = new anchor.BN(Math.floor(Date.now() / 1000) + 8);

    const [resolutionMarketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), resolutionAuthority.publicKey.toBuffer()],
      program.programId
    );

    const [resolutionCollateralVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), resolutionMarketPda.toBuffer()],
      program.programId
    );

    const [resolutionFeeVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("fee_vault"), resolutionMarketPda.toBuffer()],
      program.programId
    );

    const [resolutionYesMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("yes_mint"), resolutionMarketPda.toBuffer()],
      program.programId
    );

    const [resolutionNoMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("no_mint"), resolutionMarketPda.toBuffer()],
      program.programId
    );

    const signature = await provider.connection.requestAirdrop(
      resolutionAuthority.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(signature);

    await program.methods
      .createMarket(
        "Resolution quorum test",
        endTime,
        100,
        new anchor.BN(3600),
        quorum
      )
      .accounts({
        market: resolutionMarketPda,
        collateralVault: resolutionCollateralVault,
        feeVault: resolutionFeeVault,
        yesMint: resolutionYesMint,
        noMint: resolutionNoMint,
        collateralMint,
        authority: resolutionAuthority.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([resolutionAuthority])
      .rpc();

    const resolvers: { keypair: Keypair; resolverPda: PublicKey }[] = [];
    const stakeAmount = new anchor.BN(10 * 1e6);

    for (let i = 0; i < quorum; i++) {
      const resolverKeypair = Keypair.generate();
      const resolverAirdrop = await provider.connection.requestAirdrop(
        resolverKeypair.publicKey,
        LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(resolverAirdrop);

      const resolverTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        resolverKeypair,
        collateralMint,
        resolverKeypair.publicKey
      );

      await mintTo(
        provider.connection,
        marketAuthority,
        collateralMint,
        resolverTokenAccount.address,
        marketAuthority,
        20 * 1e6
      );

      const [resolverPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("resolver"),
          resolutionMarketPda.toBuffer(),
          resolverKeypair.publicKey.toBuffer(),
        ],
        program.programId
      );

      await program.methods
        .stakeResolver(stakeAmount)
        .accounts({
          market: resolutionMarketPda,
          resolver: resolverPda,
          collateralVault: resolutionCollateralVault,
          resolverTokenAccount: resolverTokenAccount.address,
          authority: resolverKeypair.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([resolverKeypair])
        .rpc();

      resolvers.push({ keypair: resolverKeypair, resolverPda });
    }

    const waitSeconds =
      endTime.toNumber() - Math.floor(Date.now() / 1000) + 1;
    if (waitSeconds > 0) {
      await sleep(waitSeconds * 1000);
    }

    const [firstResolver, secondResolver] = resolvers;

    await program.methods
      .submitAttestation(Buffer.from("resolver-one-attestation"))
      .accounts({
        market: resolutionMarketPda,
        resolver: firstResolver.resolverPda,
        authority: firstResolver.keypair.publicKey,
      })
      .signers([firstResolver.keypair])
      .rpc();

    let resolutionMarketAccount = await program.account.market.fetch(
      resolutionMarketPda
    );
    assert.isTrue(
      "awaitingAttestation" in resolutionMarketAccount.resolutionState
    );
    assert.equal(resolutionMarketAccount.attestationCount, 1);

    await program.methods
      .submitAttestation(Buffer.from("resolver-one-attestation-repeat"))
      .accounts({
        market: resolutionMarketPda,
        resolver: firstResolver.resolverPda,
        authority: firstResolver.keypair.publicKey,
      })
      .signers([firstResolver.keypair])
      .rpc();

    resolutionMarketAccount = await program.account.market.fetch(
      resolutionMarketPda
    );
    assert.isTrue("awaitingAttestation" in resolutionMarketAccount.resolutionState);
    assert.equal(resolutionMarketAccount.attestationCount, 1);

    await program.methods
      .submitAttestation(Buffer.from("resolver-two-attestation"))
      .accounts({
        market: resolutionMarketPda,
        resolver: secondResolver.resolverPda,
        authority: secondResolver.keypair.publicKey,
      })
      .signers([secondResolver.keypair])
      .rpc();

    resolutionMarketAccount = await program.account.market.fetch(
      resolutionMarketPda
    );
    assert.isTrue("computing" in resolutionMarketAccount.resolutionState);
    assert.equal(resolutionMarketAccount.attestationCount, quorum);
  });
});
