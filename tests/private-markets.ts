import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { PrivateMarkets } from "../target/types/private_markets";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { assert } from "chai";
import { randomBytes } from "crypto";
import {
  getArciumAccountBaseSeed,
  getArciumProgAddress,
  getComputationAccAddress,
  getCompDefAccOffset,
  getExecutingPoolAccAddress,
  getMempoolAccAddress,
  getClusterAccAddress,
  getClockAccAddress,
  getFeePoolAccAddress,
  getMXEAccAddress,
} from "@arcium-hq/client";

// Program ID
const PROGRAM_ID = new PublicKey("9Q1skR94bjCuBmX78H2MXuefMLqPsgXEzrGBN1pRUtRT");
const ARCIUM_CLUSTER_OFFSET = 3726127828;
const ARCIUM_PROGRAM_ID = getArciumProgAddress();

// Derive Sign PDA
function deriveSignPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("SignerAccount")],
    PROGRAM_ID
  );
  return pda;
}

// Helper for random bytes
function randomBytes32() {
  return Array.from(randomBytes(32));
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Ensure the computation definitions exist on the current cluster.
async function ensureComputationDefinition(
  provider: anchor.AnchorProvider,
  program: Program<PrivateMarkets>,
  compDefType: "private_trade" | "batch_clear" | "resolve_market"
) {
  const baseSeed = getArciumAccountBaseSeed("ComputationDefinitionAccount");
  const compDefOffset = getCompDefAccOffset(compDefType);
  const compDefAccount = PublicKey.findProgramAddressSync(
    [baseSeed, PROGRAM_ID.toBuffer(), compDefOffset],
    ARCIUM_PROGRAM_ID
  )[0];

  const info = await provider.connection.getAccountInfo(compDefAccount);
  if (info) {
    console.log(`Comp def ${compDefType} already initialized:`, compDefAccount.toBase58());
    return;
  }

  const mxeAccount = getMXEAccAddress(PROGRAM_ID);

  console.log(`Initializing comp def ${compDefType}...`);
  await program.methods
    .initializeComputationDefinition(compDefType)
    .accounts({
      payer: provider.wallet.publicKey,
      mxeAccount,
      compDefAccount,
      arciumProgram: ARCIUM_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log(`Comp def ${compDefType} initialized:`, compDefAccount.toBase58());
}

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
    // Initialize computation definitions for the cluster
    await ensureComputationDefinition(provider as anchor.AnchorProvider, program, "private_trade");
    await ensureComputationDefinition(provider as anchor.AnchorProvider, program, "batch_clear");
    await ensureComputationDefinition(provider as anchor.AnchorProvider, program, "resolve_market");

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

    // Derive market PDA
    [marketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), marketAuthority.publicKey.toBuffer()],
      program.programId
    );

    // Create vault token accounts (owned by market PDA)
    const collateralVaultAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      marketAuthority,
      collateralMint,
      marketPda,
      true // allowOwnerOffCurve for PDA
    );
    collateralVault = collateralVaultAccount.address;

    // Fee vault owned by authority (for fee collection)
    const feeVaultAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      marketAuthority,
      collateralMint,
      marketAuthority.publicKey
    );
    feeVault = feeVaultAccount.address;

    // Create outcome token mints
    yesMint = await createMint(
      provider.connection,
      marketAuthority,
      marketPda, // mint authority is market PDA
      null,
      6
    );

    noMint = await createMint(
      provider.connection,
      marketAuthority,
      marketPda,
      null,
      6
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
    assert.equal(marketAccount.finalOutcome, null); // Unresolved (Option<u8> = None)

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

    // Derive all Arcium accounts
    const mxeAccount = getMXEAccAddress(PROGRAM_ID);
    const signPda = deriveSignPda();
    const mempoolAccount = getMempoolAccAddress(PROGRAM_ID);
    const executingPool = getExecutingPoolAccAddress(PROGRAM_ID);
    const computationOffset = new BN(Date.now() % 10_000_000);
    const computationAccount = getComputationAccAddress(PROGRAM_ID, computationOffset);
    const baseSeed = getArciumAccountBaseSeed("ComputationDefinitionAccount");
    const compDefOffset = getCompDefAccOffset("private_trade");
    const compDefAccount = PublicKey.findProgramAddressSync(
      [baseSeed, PROGRAM_ID.toBuffer(), compDefOffset],
      getArciumProgAddress()
    )[0];
    const clusterAccount = getClusterAccAddress(ARCIUM_CLUSTER_OFFSET);
    const clockAccount = getClockAccAddress();
    const poolAccount = getFeePoolAccAddress();

    // Mock encrypted data
    const ciphertextAmount = randomBytes32();
    const ciphertextSide = randomBytes32();
    const ciphertextMaxPrice = randomBytes32();
    const nonceBn = new BN(randomBytes(16), "le");
    const clientPubkey = randomBytes32();

    const tx = await program.methods
      .submitPrivateTrade(
        computationOffset,
        ciphertextAmount,
        ciphertextSide,
        ciphertextMaxPrice,
        nonceBn,
        clientPubkey
      )
      .accounts({
        payer: user.publicKey,
        signPdaAccount: signPda,
        mxeAccount,
        mempoolAccount,
        executingPool,
        computationAccount,
        compDefAccount,
        clusterAccount,
        poolAccount,
        clockAccount,
        systemProgram: SystemProgram.programId,
        arciumProgram: getArciumProgAddress(),
        market: marketPda,
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

    // Derive all Arcium accounts
    const mxeAccount = getMXEAccAddress(PROGRAM_ID);
    const signPda = deriveSignPda();
    const mempoolAccount = getMempoolAccAddress(PROGRAM_ID);
    const executingPool = getExecutingPoolAccAddress(PROGRAM_ID);
    const computationOffset = new BN(Date.now() % 10_000_000);
    const computationAccount = getComputationAccAddress(PROGRAM_ID, computationOffset);
    const baseSeed = getArciumAccountBaseSeed("ComputationDefinitionAccount");
    const compDefOffset = getCompDefAccOffset("batch_clear");
    const compDefAccount = PublicKey.findProgramAddressSync(
      [baseSeed, PROGRAM_ID.toBuffer(), compDefOffset],
      getArciumProgAddress()
    )[0];
    const clusterAccount = getClusterAccAddress(ARCIUM_CLUSTER_OFFSET);
    const clockAccount = getClockAccAddress();
    const poolAccount = getFeePoolAccAddress();

    // Mock batch order data
    const batchOrders = [{
      commitment: randomBytes32(),
      amount: new BN(100 * 1e6),
      isBuy: true,
    }];

    const tx = await program.methods
      .submitBatchOrder(computationOffset, batchOrders)
      .accounts({
        payer: user.publicKey,
        signPdaAccount: signPda,
        mxeAccount,
        mempoolAccount,
        executingPool,
        computationAccount,
        compDefAccount,
        clusterAccount,
        poolAccount,
        clockAccount,
        systemProgram: SystemProgram.programId,
        arciumProgram: getArciumProgAddress(),
        market: marketPda,
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

    const signature = await provider.connection.requestAirdrop(
      resolutionAuthority.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(signature);

    // Create vault token accounts
    const resolutionCollateralVaultAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      resolutionAuthority,
      collateralMint,
      resolutionMarketPda,
      true
    );
    const resolutionCollateralVault = resolutionCollateralVaultAccount.address;

    const resolutionFeeVaultAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      resolutionAuthority,
      collateralMint,
      resolutionAuthority.publicKey
    );
    const resolutionFeeVault = resolutionFeeVaultAccount.address;

    // Create outcome token mints
    const resolutionYesMint = await createMint(
      provider.connection,
      resolutionAuthority,
      resolutionMarketPda,
      null,
      6
    );

    const resolutionNoMint = await createMint(
      provider.connection,
      resolutionAuthority,
      resolutionMarketPda,
      null,
      6
    );

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

    // Helper to derive Arcium accounts for submitAttestation
    const getArciumAccountsForResolver = (payer: PublicKey, resolverPda: PublicKey) => {
      const mxeAccount = getMXEAccAddress(PROGRAM_ID);
      const signPda = deriveSignPda();
      const mempoolAccount = getMempoolAccAddress(PROGRAM_ID);
      const executingPool = getExecutingPoolAccAddress(PROGRAM_ID);
      const computationOffset = new BN(Date.now() % 10_000_000 + Math.floor(Math.random() * 1000));
      const computationAccount = getComputationAccAddress(PROGRAM_ID, computationOffset);
      const baseSeed = getArciumAccountBaseSeed("ComputationDefinitionAccount");
      const compDefOffset = getCompDefAccOffset("resolve_market");
      const compDefAccount = PublicKey.findProgramAddressSync(
        [baseSeed, PROGRAM_ID.toBuffer(), compDefOffset],
        getArciumProgAddress()
      )[0];
      const clusterAccount = getClusterAccAddress(ARCIUM_CLUSTER_OFFSET);
      const clockAccount = getClockAccAddress();
      const poolAccount = getFeePoolAccAddress();

      return {
        payer,
        signPdaAccount: signPda,
        mxeAccount,
        mempoolAccount,
        executingPool,
        computationAccount,
        compDefAccount,
        clusterAccount,
        poolAccount,
        clockAccount,
        systemProgram: SystemProgram.programId,
        arciumProgram: getArciumProgAddress(),
        market: resolutionMarketPda,
        resolver: resolverPda,
        computationOffset,
      };
    };

    // First attestation
    const arciumAccounts1 = getArciumAccountsForResolver(firstResolver.keypair.publicKey, firstResolver.resolverPda);
    const attestation1 = randomBytes32();

    await program.methods
      .submitAttestation(arciumAccounts1.computationOffset, attestation1)
      .accounts({
        payer: arciumAccounts1.payer,
        signPdaAccount: arciumAccounts1.signPdaAccount,
        mxeAccount: arciumAccounts1.mxeAccount,
        mempoolAccount: arciumAccounts1.mempoolAccount,
        executingPool: arciumAccounts1.executingPool,
        computationAccount: arciumAccounts1.computationAccount,
        compDefAccount: arciumAccounts1.compDefAccount,
        clusterAccount: arciumAccounts1.clusterAccount,
        poolAccount: arciumAccounts1.poolAccount,
        clockAccount: arciumAccounts1.clockAccount,
        systemProgram: arciumAccounts1.systemProgram,
        arciumProgram: arciumAccounts1.arciumProgram,
        market: arciumAccounts1.market,
        resolver: arciumAccounts1.resolver,
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

    // Second attestation (repeat by same resolver - should not increment)
    const arciumAccounts2 = getArciumAccountsForResolver(firstResolver.keypair.publicKey, firstResolver.resolverPda);
    const attestation2 = randomBytes32();

    await program.methods
      .submitAttestation(arciumAccounts2.computationOffset, attestation2)
      .accounts({
        payer: arciumAccounts2.payer,
        signPdaAccount: arciumAccounts2.signPdaAccount,
        mxeAccount: arciumAccounts2.mxeAccount,
        mempoolAccount: arciumAccounts2.mempoolAccount,
        executingPool: arciumAccounts2.executingPool,
        computationAccount: arciumAccounts2.computationAccount,
        compDefAccount: arciumAccounts2.compDefAccount,
        clusterAccount: arciumAccounts2.clusterAccount,
        poolAccount: arciumAccounts2.poolAccount,
        clockAccount: arciumAccounts2.clockAccount,
        systemProgram: arciumAccounts2.systemProgram,
        arciumProgram: arciumAccounts2.arciumProgram,
        market: arciumAccounts2.market,
        resolver: arciumAccounts2.resolver,
      })
      .signers([firstResolver.keypair])
      .rpc();

    resolutionMarketAccount = await program.account.market.fetch(
      resolutionMarketPda
    );
    assert.isTrue("awaitingAttestation" in resolutionMarketAccount.resolutionState);
    assert.equal(resolutionMarketAccount.attestationCount, 1);

    // Third attestation (by second resolver - should reach quorum)
    const arciumAccounts3 = getArciumAccountsForResolver(secondResolver.keypair.publicKey, secondResolver.resolverPda);
    const attestation3 = randomBytes32();

    await program.methods
      .submitAttestation(arciumAccounts3.computationOffset, attestation3)
      .accounts({
        payer: arciumAccounts3.payer,
        signPdaAccount: arciumAccounts3.signPdaAccount,
        mxeAccount: arciumAccounts3.mxeAccount,
        mempoolAccount: arciumAccounts3.mempoolAccount,
        executingPool: arciumAccounts3.executingPool,
        computationAccount: arciumAccounts3.computationAccount,
        compDefAccount: arciumAccounts3.compDefAccount,
        clusterAccount: arciumAccounts3.clusterAccount,
        poolAccount: arciumAccounts3.poolAccount,
        clockAccount: arciumAccounts3.clockAccount,
        systemProgram: arciumAccounts3.systemProgram,
        arciumProgram: arciumAccounts3.arciumProgram,
        market: arciumAccounts3.market,
        resolver: arciumAccounts3.resolver,
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
