# Private Prediction Markets

**Permissionless, Fair Prediction & Opinion Markets on Solana with Arcium MPC**

Built for the Colosseum Cypherpunk Hackathon - Arcium Side Track

## Overview

A privacy-preserving prediction market protocol where user information (orders, positions, signals) remains private by default, ensuring fair play and preventing manipulation through Arcium's confidential compute.

## Key Features

- **Private Trading**: Orders and positions remain confidential using Arcium MPC
- **Manipulation-Resistant**: Sealed-bid batch auctions and private CFMM prevent front-running
- **Trust-Minimized Resolution**: Decentralized resolver network with MPC aggregation
- **Permissionless Markets**: Anyone can create binary prediction markets

## Architecture

- **Onchain (Solana)**: Market registry, collateral vaults, outcome tokens, settlement
- **Arcium MPC**: Private computations for trades, batch clearing, and resolution
- **Client**: TypeScript SDK + Next.js + Phantom Wallet

## Tech Stack

- **Smart Contracts**: Anchor/Arcis (Rust)
- **Confidential Compute**: Arcium MPC (Cerberus cluster)
- **Client SDK**: TypeScript + Arcium SDK
- **Frontend**: Next.js + TailwindCSS + Phantom Wallet
- **Blockchain**: Solana Devnet

## Project Structure

```
├── programs/           # Arcium MXE program (Arcis)
│   └── private-markets/
│       └── src/
│           ├── lib.rs
│           ├── state.rs
│           └── computations/
│               ├── private_trade.rs
│               ├── batch_clear.rs
│               └── resolve_market.rs
├── app/               # Next.js frontend
├── sdk/               # TypeScript client SDK
├── tests/             # Integration tests
└── docs/              # Documentation
    └── PRD.md
```

## Prerequisites

- Rust 1.75+
- Solana CLI
- Anchor 0.30+
- Arcium CLI
- Node.js 18+
- Yarn
- Docker & Docker Compose

## Installation

### 1. Install Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup default stable
```

### 2. Install Solana CLI
```bash
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
solana-keygen new
```

### 3. Install Anchor
```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

### 4. Install Arcium
```bash
curl --proto '=https' --tlsv1.2 -sSfL https://install.arcium.com/ | bash
arcup install
```

### 5. Install Node Dependencies
```bash
yarn install
```

## Quick Start

### 1. Configure Solana
```bash
solana config set --url devnet
solana airdrop 2
```

### 2. Build the MXE Program
```bash
arcium build
```

### 3. Run Tests
```bash
arcium test
```

### 4. Deploy to Devnet
```bash
arcium deploy --cluster devnet
```

### 5. Start Frontend
```bash
cd app
yarn dev
```

## Usage

### Create a Market
```typescript
import { PrivateMarketClient } from './sdk';

const client = new PrivateMarketClient(connection, wallet);
const market = await client.createMarket({
  question: "Will ETH hit $5000 by EOY?",
  endTime: new Date('2025-12-31'),
  feeBps: 100, // 1%
});
```

### Submit Private Trade
```typescript
const trade = await client.submitPrivateTrade({
  marketId: market.publicKey,
  side: 'YES',
  amount: 1000,
  slippage: 0.01,
});
```

### Resolve Market
```typescript
await client.resolveMarket({
  marketId: market.publicKey,
  outcome: 'YES',
  attestation: privateAttestation,
});
```

## Confidential Computations

### PrivateTrade
- Validates collateral and constraints
- Applies CPMM math on encrypted inputs
- Outputs state commitment + minimal deltas

### BatchClear
- Clears sealed orders to uniform price
- Computes fills and fees
- Updates CFMM state

### ResolveMarket
- Aggregates encrypted resolver attestations
- Emits final outcome with proof signatures
- Triggers slashing for misaligned resolvers

## Security

- **Privacy**: All orders and positions encrypted via Arcium MPC
- **Fair Execution**: Batch auctions prevent MEV and front-running
- **Trustless**: Cerberus MPC with Byzantine Fault Tolerance
- **Verifiable**: All outputs verified onchain

## Testing

```bash
# Unit tests
arcium test

# Integration tests
yarn test

# E2E tests
yarn test:e2e
```

## Resources

### Arcium Documentation
- [Arcium Developers](https://docs.arcium.com/developers)
- [TypeScript SDK](https://ts.arcium.com/api)
- [Examples Repo](https://github.com/arcium-hq/examples)

### Hackathon
- [Colosseum Cypherpunk](https://www.colosseum.com/cypherpunk)
- [Official Rules](https://www.colosseum.com/files/Solana%20Cypherpunk%20Hackathon%20Official%20Rules.pdf)

### Solana
- [Solana Docs](https://solana.com/docs)
- [Anchor Framework](https://www.anchor-lang.com/)

## Roadmap

- [x] PRD and architecture design
- [ ] Core MXE program implementation
- [ ] Private trade computation
- [ ] Batch clearing mechanism
- [ ] Resolver network and resolution
- [ ] TypeScript SDK
- [ ] Frontend MVP
- [ ] Devnet deployment
- [ ] Testing and documentation
- [ ] Demo video

## Future Enhancements

- Multi-outcome markets (LMSR)
- Private limit order books
- DAO governance
- Conditional markets
- Cross-chain settlement

## Contributing

This is a hackathon project. For questions or collaboration, open an issue.

## License

MIT

## Acknowledgments

Built with [Arcium](https://arcium.com) for the [Colosseum Cypherpunk Hackathon](https://www.colosseum.com/cypherpunk).
