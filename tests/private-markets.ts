import * as anchor from "@coral-xyz/anchor";
// Avoid strict Program typing to support multiple CLI versions
// Type import removed to avoid requiring generated types during CI
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

  // Build a Program from an inline minimal IDL to avoid dependency on generated files
  const idl: any = {
    version: "0.1.0",
    name: "private_markets",
    address: "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS",
    instructions: [
      {
        name: "create_market",
        accounts: [
          { name: "market", isMut: true, isSigner: false },
          { name: "collateral_vault", isMut: true, isSigner: false },
          { name: "fee_vault", isMut: true, isSigner: false },
          { name: "yes_mint", isMut: true, isSigner: false },
          { name: "no_mint", isMut: true, isSigner: false },
          { name: "collateral_mint", isMut: false, isSigner: false },
          { name: "authority", isMut: true, isSigner: true },
          { name: "system_program", isMut: false, isSigner: false },
          { name: "token_program", isMut: false, isSigner: false },
          { name: "rent", isMut: false, isSigner: false },
        ],
        args: [
          { name: "question", type: "string" },
          { name: "end_time", type: "i64" },
          { name: "fee_bps", type: "u16" },
          { name: "batch_interval", type: "i64" },
          { name: "resolver_quorum", type: "u8" },
        ],
      },
      {
        name: "deposit_collateral",
        accounts: [
          { name: "market", isMut: false, isSigner: false },
          { name: "collateral_vault", isMut: true, isSigner: false },
          { name: "user_collateral", isMut: true, isSigner: false },
          { name: "yes_mint", isMut: true, isSigner: false },
          { name: "no_mint", isMut: true, isSigner: false },
          { name: "user_yes_tokens", isMut: true, isSigner: false },
          { name: "user_no_tokens", isMut: true, isSigner: false },
          { name: "user", isMut: true, isSigner: true },
          { name: "token_program", isMut: false, isSigner: false },
        ],
        args: [{ name: "amount", type: "u64" }],
      },
      {
        name: "submit_private_trade",
        accounts: [
          { name: "market", isMut: true, isSigner: false },
          { name: "user", isMut: true, isSigner: true },
        ],
        args: [{ name: "encrypted_order", type: { vec: "u8" } }],
      },
      {
        name: "submit_batch_order",
        accounts: [
          { name: "market", isMut: true, isSigner: false },
          { name: "user", isMut: true, isSigner: true },
        ],
        args: [{ name: "order_commitment", type: { array: ["u8", 32] } }],
      },
      {
        name: "stake_resolver",
        accounts: [
          { name: "market", isMut: true, isSigner: false },
          { name: "resolver", isMut: true, isSigner: false },
          { name: "collateral_vault", isMut: true, isSigner: false },
          { name: "resolver_token_account", isMut: true, isSigner: false },
          { name: "authority", isMut: true, isSigner: true },
          { name: "system_program", isMut: false, isSigner: false },
          { name: "token_program", isMut: false, isSigner: false },
        ],
        args: [{ name: "amount", type: "u64" }],
      },
      {
        name: "submit_attestation",
        accounts: [
          { name: "market", isMut: true, isSigner: false },
          { name: "resolver", isMut: true, isSigner: false },
          { name: "authority", isMut: false, isSigner: true },
        ],
        args: [{ name: "encrypted_attestation", type: { vec: "u8" } }],
      },
      {
        name: "resolve_market",
        accounts: [
          { name: "market", isMut: true, isSigner: false },
          { name: "arcium_authority", isMut: false, isSigner: true },
        ],
        args: [
          { name: "final_outcome", type: "u8" },
          { name: "resolution_proof", type: { vec: "u8" } },
        ],
      },
      {
        name: "redeem_tokens",
        accounts: [
          { name: "market", isMut: false, isSigner: false },
          { name: "outcome_mint", isMut: true, isSigner: false },
          { name: "user_outcome_tokens", isMut: true, isSigner: false },
          { name: "collateral_vault", isMut: true, isSigner: false },
          { name: "user_collateral_account", isMut: true, isSigner: false },
          { name: "user", isMut: true, isSigner: true },
          { name: "token_program", isMut: false, isSigner: false },
        ],
        args: [{ name: "amount", type: "u64" }],
      },
    ],
  };
  const programId = new PublicKey("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");
  const program = new (anchor as any).Program(idl, anchor.getProvider(), programId);
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
    const endTime = new anchor.BN(Math.floor(Date.now() / 1000) + 30); // 30 seconds from now (for tests)
    const feeBps = 100; // 1%
    const batchInterval = new anchor.BN(3600); // 1 hour
    const resolverQuorum = 1; // simplify tests

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

    // Create user YES/NO token accounts
    const userYes = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      user,
      yesMint,
      user.publicKey
    );
    const userNo = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      user,
      noMint,
      user.publicKey
    );

    // Deposit collateral (mints outcome pair 1:1)
    const depositAmount = new anchor.BN(100 * 1e6); // 100 USDC
    const tx = await program.methods
      .depositCollateral(depositAmount)
      .accounts({
        market: marketPda,
        collateralVault,
        userCollateral: userCollateral.address,
        yesMint,
        noMint,
        userYesTokens: userYes.address,
        userNoTokens: userNo.address,
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

    // Verify outcome tokens minted 1:1
    const yesBal = await provider.connection.getTokenAccountBalance(userYes.address);
    const noBal = await provider.connection.getTokenAccountBalance(userNo.address);
    assert.equal(yesBal.value.uiAmount, 100);
    assert.equal(noBal.value.uiAmount, 100);

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

  it("Resolves market and redeems winning tokens", async () => {
    const user = Keypair.generate();

    // Airdrop SOL
    let sig = await provider.connection.requestAirdrop(user.publicKey, LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(sig);

    // Create user's token accounts and mint collateral
    const userCollateral = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      user,
      collateralMint,
      user.publicKey
    );

    const userYes = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      user,
      yesMint,
      user.publicKey
    );
    const userNo = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      user,
      noMint,
      user.publicKey
    );

    await mintTo(
      provider.connection,
      marketAuthority,
      collateralMint,
      userCollateral.address,
      marketAuthority,
      200 * 1e6
    );

    // Deposit 100 to mint YES/NO pair
    await program.methods
      .depositCollateral(new anchor.BN(100 * 1e6))
      .accounts({
        market: marketPda,
        collateralVault,
        userCollateral: userCollateral.address,
        yesMint,
        noMint,
        userYesTokens: userYes.address,
        userNoTokens: userNo.address,
        user: user.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

    // Wait for market end (set to ~30s at creation)
    await new Promise((r) => setTimeout(r, 35_000));

    // Stake resolver
    const resolver = Keypair.generate();
    sig = await provider.connection.requestAirdrop(resolver.publicKey, LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(sig);

    const resolverToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      resolver,
      collateralMint,
      resolver.publicKey
    );

    await mintTo(
      provider.connection,
      marketAuthority,
      collateralMint,
      resolverToken.address,
      marketAuthority,
      10 * 1e6
    );

    // Derive resolver PDA (program will init)
    const [resolverPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("resolver"), marketPda.toBuffer(), resolver.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .stakeResolver(new anchor.BN(5 * 1e6))
      .accounts({
        market: marketPda,
        resolver: resolverPda,
        collateralVault,
        resolverTokenAccount: resolverToken.address,
        authority: resolver.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([resolver])
      .rpc();

    // Submit attestation (any bytes)
    await program.methods
      .submitAttestation(Buffer.from([1, 2, 3]))
      .accounts({
        market: marketPda,
        resolver: resolverPda,
        authority: resolver.publicKey,
      })
      .signers([resolver])
      .rpc();

    // Finalize resolution with YES (1)
    const arcium = Keypair.generate();
    await program.methods
      .resolveMarket(1, Buffer.from([9, 9]))
      .accounts({
        market: marketPda,
        arciumAuthority: arcium.publicKey,
      })
      .signers([arcium])
      .rpc();

    // Redeem YES tokens
    await program.methods
      .redeemTokens(new anchor.BN(100 * 1e6))
      .accounts({
        market: marketPda,
        outcomeMint: yesMint,
        userOutcomeTokens: userYes.address,
        collateralVault,
        userCollateralAccount: userCollateral.address,
        user: user.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

    const bal = await provider.connection.getTokenAccountBalance(userCollateral.address);
    // User started with 200, sent 100 to vault, then redeemed 100 => back to ~200
    assert.equal(bal.value.uiAmount, 200);
  });
});
