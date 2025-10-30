import {
  Connection,
  PublicKey,
  Transaction,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { Program, AnchorProvider, BN, web3 } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";

// Constants
const MARKET_SEED = Buffer.from("market");
const VAULT_SEED = Buffer.from("vault");
const FEE_VAULT_SEED = Buffer.from("fee_vault");
const YES_MINT_SEED = Buffer.from("yes_mint");
const NO_MINT_SEED = Buffer.from("no_mint");
const RESOLVER_SEED = Buffer.from("resolver");
const BATCH_SEED = Buffer.from("batch");

export interface MarketConfig {
  question: string;
  endTime: Date;
  feeBps: number;
  batchInterval: number; // seconds
  resolverQuorum: number;
}

export interface TradeOrder {
  side: "YES" | "NO";
  amount: number;
  slippage: number;
}

export interface MarketState {
  authority: PublicKey;
  question: string;
  endTime: BN;
  feeBps: number;
  batchInterval: BN;
  nextBatchClear: BN;
  resolverQuorum: number;
  resolverCount: number;
  yesReserves: BN;
  noReserves: BN;
  totalVolume: BN;
  resolutionState: any;
  finalOutcome: number;
}

export class PrivateMarketsClient {
  constructor(
    private connection: Connection,
    private program: Program,
    private wallet: any
  ) {}

  /**
   * Derive market PDA
   */
  getMarketPDA(authority: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [MARKET_SEED, authority.toBuffer()],
      this.program.programId
    );
  }

  /**
   * Derive vault PDAs
   */
  getVaultPDAs(marketPubkey: PublicKey): {
    collateralVault: [PublicKey, number];
    feeVault: [PublicKey, number];
    yesMint: [PublicKey, number];
    noMint: [PublicKey, number];
  } {
    return {
      collateralVault: PublicKey.findProgramAddressSync(
        [VAULT_SEED, marketPubkey.toBuffer()],
        this.program.programId
      ),
      feeVault: PublicKey.findProgramAddressSync(
        [FEE_VAULT_SEED, marketPubkey.toBuffer()],
        this.program.programId
      ),
      yesMint: PublicKey.findProgramAddressSync(
        [YES_MINT_SEED, marketPubkey.toBuffer()],
        this.program.programId
      ),
      noMint: PublicKey.findProgramAddressSync(
        [NO_MINT_SEED, marketPubkey.toBuffer()],
        this.program.programId
      ),
    };
  }

  /**
   * Create a new prediction market
   */
  async createMarket(
    config: MarketConfig,
    collateralMint: PublicKey
  ): Promise<{ signature: string; marketPubkey: PublicKey }> {
    const [marketPubkey] = this.getMarketPDA(this.wallet.publicKey);
    const pdas = this.getVaultPDAs(marketPubkey);

    const endTime = new BN(Math.floor(config.endTime.getTime() / 1000));
    const batchInterval = new BN(config.batchInterval);

    const tx = await this.program.methods
      .createMarket(
        config.question,
        endTime,
        config.feeBps,
        batchInterval,
        config.resolverQuorum
      )
      .accounts({
        market: marketPubkey,
        collateralVault: pdas.collateralVault[0],
        feeVault: pdas.feeVault[0],
        yesMint: pdas.yesMint[0],
        noMint: pdas.noMint[0],
        collateralMint,
        authority: this.wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    return {
      signature: tx,
      marketPubkey,
    };
  }

  /**
   * Deposit collateral into a market
   */
  async depositCollateral(
    marketPubkey: PublicKey,
    amount: BN,
    userCollateralAccount: PublicKey
  ): Promise<string> {
    const market = await this.getMarketState(marketPubkey);
    const pdas = this.getVaultPDAs(marketPubkey);

    const tx = await this.program.methods
      .depositCollateral(amount)
      .accounts({
        market: marketPubkey,
        collateralVault: pdas.collateralVault[0],
        userCollateral: userCollateralAccount,
        user: this.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    return tx;
  }

  /**
   * Submit a private trade order
   * Note: In production, this would encrypt the order using Arcium SDK
   */
  async submitPrivateTrade(
    marketPubkey: PublicKey,
    order: TradeOrder
  ): Promise<string> {
    // Mock encryption - in production, use Arcium encryption
    const encryptedOrder = Buffer.from(JSON.stringify(order));

    const tx = await this.program.methods
      .submitPrivateTrade(encryptedOrder)
      .accounts({
        market: marketPubkey,
        user: this.wallet.publicKey,
      })
      .rpc();

    return tx;
  }

  /**
   * Submit a batch order
   */
  async submitBatchOrder(
    marketPubkey: PublicKey,
    orderCommitment: number[]
  ): Promise<string> {
    const tx = await this.program.methods
      .submitBatchOrder(orderCommitment)
      .accounts({
        market: marketPubkey,
        user: this.wallet.publicKey,
      })
      .rpc();

    return tx;
  }

  /**
   * Stake to become a resolver
   */
  async stakeResolver(
    marketPubkey: PublicKey,
    amount: BN,
    resolverTokenAccount: PublicKey
  ): Promise<string> {
    const [resolverPda] = PublicKey.findProgramAddressSync(
      [RESOLVER_SEED, marketPubkey.toBuffer(), this.wallet.publicKey.toBuffer()],
      this.program.programId
    );

    const pdas = this.getVaultPDAs(marketPubkey);

    const tx = await this.program.methods
      .stakeResolver(amount)
      .accounts({
        market: marketPubkey,
        resolver: resolverPda,
        collateralVault: pdas.collateralVault[0],
        resolverTokenAccount,
        authority: this.wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    return tx;
  }

  /**
   * Submit attestation for market resolution
   */
  async submitAttestation(
    marketPubkey: PublicKey,
    encryptedAttestation: Buffer
  ): Promise<string> {
    const [resolverPda] = PublicKey.findProgramAddressSync(
      [RESOLVER_SEED, marketPubkey.toBuffer(), this.wallet.publicKey.toBuffer()],
      this.program.programId
    );

    const tx = await this.program.methods
      .submitAttestation(encryptedAttestation)
      .accounts({
        market: marketPubkey,
        resolver: resolverPda,
        authority: this.wallet.publicKey,
      })
      .rpc();

    return tx;
  }

  /**
   * Redeem winning tokens for collateral
   */
  async redeemTokens(
    marketPubkey: PublicKey,
    amount: BN,
    isYesToken: boolean,
    userOutcomeTokens: PublicKey,
    userCollateralAccount: PublicKey
  ): Promise<string> {
    const pdas = this.getVaultPDAs(marketPubkey);
    const outcomeMint = isYesToken ? pdas.yesMint[0] : pdas.noMint[0];

    const tx = await this.program.methods
      .redeemTokens(amount)
      .accounts({
        market: marketPubkey,
        outcomeMint,
        userOutcomeTokens,
        collateralVault: pdas.collateralVault[0],
        userCollateralAccount,
        user: this.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    return tx;
  }

  /**
   * Get market state
   */
  async getMarketState(marketPubkey: PublicKey): Promise<MarketState> {
    const market = await this.program.account.market.fetch(marketPubkey);
    return market as MarketState;
  }

  /**
   * Get current price for a side (YES or NO)
   * Uses CPMM formula: price = reserves_other / (reserves_yes + reserves_no)
   */
  getCurrentPrice(market: MarketState, side: "YES" | "NO"): number {
    const yesReserves = market.yesReserves.toNumber();
    const noReserves = market.noReserves.toNumber();
    const totalReserves = yesReserves + noReserves;

    if (side === "YES") {
      return noReserves / totalReserves;
    } else {
      return yesReserves / totalReserves;
    }
  }

  /**
   * Calculate expected outcome tokens for a trade
   * Using CPMM: k = x * y, where k is constant
   */
  calculateExpectedTokens(
    market: MarketState,
    side: "YES" | "NO",
    collateralAmount: number
  ): { tokens: number; newPrice: number } {
    const yesReserves = market.yesReserves.toNumber();
    const noReserves = market.noReserves.toNumber();
    const k = yesReserves * noReserves;

    let newYesReserves: number;
    let newNoReserves: number;
    let tokens: number;

    if (side === "YES") {
      // Buying YES: add collateral to NO reserves, remove from YES reserves
      newNoReserves = noReserves + collateralAmount;
      newYesReserves = k / newNoReserves;
      tokens = yesReserves - newYesReserves;
    } else {
      // Buying NO: add collateral to YES reserves, remove from NO reserves
      newYesReserves = yesReserves + collateralAmount;
      newNoReserves = k / newYesReserves;
      tokens = noReserves - newNoReserves;
    }

    const newPrice =
      side === "YES"
        ? newNoReserves / (newYesReserves + newNoReserves)
        : newYesReserves / (newYesReserves + newNoReserves);

    return { tokens, newPrice };
  }

  /**
   * List all markets
   */
  async listMarkets(): Promise<Array<{ pubkey: PublicKey; account: MarketState }>> {
    const markets = await this.program.account.market.all();
    return markets as Array<{ pubkey: PublicKey; account: MarketState }>;
  }
}

// Helper function to create client
export function createClient(
  connection: Connection,
  program: Program,
  wallet: any
): PrivateMarketsClient {
  return new PrivateMarketsClient(connection, program, wallet);
}

export * from "@solana/web3.js";
export { BN } from "@coral-xyz/anchor";
