# Private Markets TypeScript SDK

TypeScript client library for interacting with Private Prediction Markets on Solana.

## Installation

```bash
yarn add @private-markets/sdk @coral-xyz/anchor @solana/web3.js
```

## Quick Start

```typescript
import { Connection, Keypair } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { createClient, MarketConfig } from "@private-markets/sdk";
import idl from "./idl/private_markets.json";

// Setup connection and provider
const connection = new Connection("https://api.devnet.solana.com");
const wallet = /* your wallet */;
const provider = new AnchorProvider(connection, wallet, {});
const program = new Program(idl, provider);

// Create client
const client = createClient(connection, program, wallet);

// Create a market
const marketConfig: MarketConfig = {
  question: "Will ETH hit $5000 by EOY?",
  endTime: new Date("2025-12-31"),
  feeBps: 100, // 1%
  batchInterval: 3600, // 1 hour
  resolverQuorum: 3,
};

const { marketPubkey } = await client.createMarket(
  marketConfig,
  collateralMintPubkey
);

// Deposit collateral
await client.depositCollateral(
  marketPubkey,
  new BN(1000 * 1e6), // 1000 USDC
  userCollateralAccount
);

// Submit a private trade
await client.submitPrivateTrade(marketPubkey, {
  side: "YES",
  amount: 100,
  slippage: 0.01,
});

// Get market state
const market = await client.getMarketState(marketPubkey);
console.log("Current YES price:", client.getCurrentPrice(market, "YES"));
```

## API Reference

### `PrivateMarketsClient`

Main client class for interacting with the program.

#### Constructor
```typescript
new PrivateMarketsClient(
  connection: Connection,
  program: Program,
  wallet: Wallet
)
```

#### Methods

##### `createMarket(config: MarketConfig, collateralMint: PublicKey)`
Create a new prediction market.

**Parameters:**
- `config.question`: Market question (max 200 chars)
- `config.endTime`: Market end date
- `config.feeBps`: Protocol fee in basis points (10-1000)
- `config.batchInterval`: Batch auction interval in seconds (300-86400)
- `config.resolverQuorum`: Minimum resolvers required (1-10)
- `collateralMint`: SPL token mint for collateral

**Returns:** `{ signature: string, marketPubkey: PublicKey }`

##### `depositCollateral(marketPubkey, amount, userCollateralAccount)`
Deposit collateral into a market vault.

##### `submitPrivateTrade(marketPubkey, order)`
Submit an encrypted trade order.

**Order:**
```typescript
{
  side: "YES" | "NO",
  amount: number,
  slippage: number
}
```

##### `submitBatchOrder(marketPubkey, orderCommitment)`
Submit a sealed order for batch auction.

##### `stakeResolver(marketPubkey, amount, resolverTokenAccount)`
Stake collateral to become a market resolver.

##### `submitAttestation(marketPubkey, encryptedAttestation)`
Submit encrypted attestation for market resolution.

##### `redeemTokens(marketPubkey, amount, isYesToken, userOutcomeTokens, userCollateralAccount)`
Redeem winning outcome tokens for collateral.

##### `getMarketState(marketPubkey)`
Fetch current market state.

**Returns:** `MarketState`

##### `getCurrentPrice(market, side)`
Calculate current price for YES or NO side.

**Returns:** `number` (0-1)

##### `calculateExpectedTokens(market, side, collateralAmount)`
Calculate expected outcome tokens for a trade.

**Returns:** `{ tokens: number, newPrice: number }`

##### `listMarkets()`
List all markets.

**Returns:** `Array<{ pubkey: PublicKey, account: MarketState }>`

## Types

### `MarketConfig`
```typescript
interface MarketConfig {
  question: string;
  endTime: Date;
  feeBps: number;
  batchInterval: number;
  resolverQuorum: number;
}
```

### `TradeOrder`
```typescript
interface TradeOrder {
  side: "YES" | "NO";
  amount: number;
  slippage: number;
}
```

### `MarketState`
```typescript
interface MarketState {
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
  resolutionState: ResolutionState;
  finalOutcome: number; // 0 = NO, 1 = YES, 255 = unresolved
}
```

## Privacy Features

### Arcium Integration

In production, orders are encrypted using Arcium's MPC network:

```typescript
import { ArciumClient } from "@arcium/sdk";

// Initialize Arcium client
const arcium = new ArciumClient(/* config */);

// Encrypt order
const order = { side: "YES", amount: 100, slippage: 0.01 };
const encryptedOrder = await arcium.encrypt(order);

// Submit to program
await client.submitPrivateTrade(marketPubkey, encryptedOrder);
```

### What Remains Private

- Individual order sizes and directions
- User positions (YES/NO holdings)
- Batch order details until clearing
- Resolver attestations

### What's Public

- Aggregate reserves (YES/NO)
- Current prices
- Total volume
- Final resolution outcome

## Examples

### Trading Flow

```typescript
// 1. Create market
const { marketPubkey } = await client.createMarket(config, usdcMint);

// 2. Deposit collateral
await client.depositCollateral(marketPubkey, amount, userAccount);

// 3. Check current price
const market = await client.getMarketState(marketPubkey);
const price = client.getCurrentPrice(market, "YES");
console.log(`Current YES price: $${price.toFixed(2)}`);

// 4. Calculate expected tokens
const { tokens, newPrice } = client.calculateExpectedTokens(
  market,
  "YES",
  100
);
console.log(`Will receive ${tokens.toFixed(2)} YES tokens`);
console.log(`New price: $${newPrice.toFixed(2)}`);

// 5. Submit trade
await client.submitPrivateTrade(marketPubkey, {
  side: "YES",
  amount: 100,
  slippage: 0.01,
});
```

### Resolution Flow

```typescript
// 1. Stake to become resolver
await client.stakeResolver(marketPubkey, stakeAmount, resolverAccount);

// 2. After market ends, submit attestation
const attestation = await arcium.encrypt({ outcome: "YES" });
await client.submitAttestation(marketPubkey, attestation);

// 3. After resolution, redeem winning tokens
await client.redeemTokens(
  marketPubkey,
  tokenAmount,
  true, // isYesToken
  userYesTokens,
  userCollateralAccount
);
```

## Development

```bash
# Install dependencies
yarn install

# Build
yarn build

# Watch mode
yarn watch
```

## License

MIT
