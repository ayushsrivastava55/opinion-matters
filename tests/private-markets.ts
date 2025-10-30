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

  it("Redeems winning tokens", async () => {
    const redeemMarketAuthority = Keypair.generate();

    const airdropRedeemAuthority = await provider.connection.requestAirdrop(
      redeemMarketAuthority.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropRedeemAuthority);

    const [redeemMarketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), redeemMarketAuthority.publicKey.toBuffer()],
      program.programId
    );

    const [redeemCollateralVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), redeemMarketPda.toBuffer()],
      program.programId
    );

    const [redeemFeeVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("fee_vault"), redeemMarketPda.toBuffer()],
      program.programId
    );

    const [redeemYesMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("yes_mint"), redeemMarketPda.toBuffer()],
      program.programId
    );

    const [redeemNoMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("no_mint"), redeemMarketPda.toBuffer()],
      program.programId
    );

    const now = Math.floor(Date.now() / 1000);
    const shortEndTime = new anchor.BN(now + 5);
    const batchInterval = new anchor.BN(60);

    await program.methods
      .createMarket(
        "Will the quick resolution test succeed?",
        shortEndTime,
        100,
        batchInterval,
        1
      )
      .accounts({
        market: redeemMarketPda,
        collateralVault: redeemCollateralVault,
        feeVault: redeemFeeVault,
        yesMint: redeemYesMint,
        noMint: redeemNoMint,
        collateralMint,
        authority: redeemMarketAuthority.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([redeemMarketAuthority])
      .rpc();

    const redeemer = Keypair.generate();
    const airdropRedeemer = await provider.connection.requestAirdrop(
      redeemer.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropRedeemer);

    const redeemerCollateral = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      redeemer,
      collateralMint,
      redeemer.publicKey
    );

    await mintTo(
      provider.connection,
      marketAuthority,
      collateralMint,
      redeemerCollateral.address,
      marketAuthority,
      200 * 1e6
    );

    const depositAmount = new anchor.BN(200 * 1e6);
    await program.methods
      .depositCollateral(depositAmount)
      .accounts({
        market: redeemMarketPda,
        collateralVault: redeemCollateralVault,
        userCollateral: redeemerCollateral.address,
        user: redeemer.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([redeemer])
      .rpc();

    const resolverAuthority = Keypair.generate();
    const airdropResolver = await provider.connection.requestAirdrop(
      resolverAuthority.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropResolver);

    const resolverCollateral = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      resolverAuthority,
      collateralMint,
      resolverAuthority.publicKey
    );

    await mintTo(
      provider.connection,
      marketAuthority,
      collateralMint,
      resolverCollateral.address,
      marketAuthority,
      50 * 1e6
    );

    const [resolverPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("resolver"),
        redeemMarketPda.toBuffer(),
        resolverAuthority.publicKey.toBuffer(),
      ],
      program.programId
    );

    const stakeAmount = new anchor.BN(10 * 1e6);
    await program.methods
      .stakeResolver(stakeAmount)
      .accounts({
        market: redeemMarketPda,
        resolver: resolverPda,
        collateralVault: redeemCollateralVault,
        resolverTokenAccount: resolverCollateral.address,
        authority: resolverAuthority.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([resolverAuthority])
      .rpc();

    const redeemerYesTokens = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      redeemer,
      redeemYesMint,
      redeemer.publicKey
    );

    await new Promise((resolve) => setTimeout(resolve, 6000));

    const attestationPayload = Buffer.from("winner_yes");
    await program.methods
      .submitAttestation([...attestationPayload])
      .accounts({
        market: redeemMarketPda,
        resolver: resolverPda,
        authority: resolverAuthority.publicKey,
      })
      .signers([resolverAuthority])
      .rpc();

    const arciumAuthority = Keypair.generate();
    const airdropArcium = await provider.connection.requestAirdrop(
      arciumAuthority.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropArcium);

    await program.methods
      .resolveMarket(1, Array.from(Buffer.from("proof")))
      .accounts({
        market: redeemMarketPda,
        arciumAuthority: arciumAuthority.publicKey,
      })
      .signers([arciumAuthority])
      .rpc();

    const mintAmount = new anchor.BN(50 * 1e6);
    await program.methods
      .mintOutcomeTokens(mintAmount)
      .accounts({
        market: redeemMarketPda,
        outcomeMint: redeemYesMint,
        recipientTokenAccount: redeemerYesTokens.address,
        authority: redeemMarketAuthority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([redeemMarketAuthority])
      .rpc();

    const yesBalanceBefore = await provider.connection.getTokenAccountBalance(
      redeemerYesTokens.address
    );
    assert.equal(yesBalanceBefore.value.uiAmount, 50);

    const redeemAmount = new anchor.BN(50 * 1e6);
    await program.methods
      .redeemTokens(redeemAmount)
      .accounts({
        market: redeemMarketPda,
        outcomeMint: redeemYesMint,
        userOutcomeTokens: redeemerYesTokens.address,
        collateralVault: redeemCollateralVault,
        userCollateralAccount: redeemerCollateral.address,
        user: redeemer.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([redeemer])
      .rpc();

    const yesBalanceAfter = await provider.connection.getTokenAccountBalance(
      redeemerYesTokens.address
    );
    assert.equal(yesBalanceAfter.value.uiAmount, 0);

    const userCollateralAfter = await provider.connection.getTokenAccountBalance(
      redeemerCollateral.address
    );
    assert.equal(userCollateralAfter.value.uiAmount, 50);
  });
});
