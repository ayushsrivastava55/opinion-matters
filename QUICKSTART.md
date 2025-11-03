# Quick Start Guide - Private Prediction Markets

This guide will help you get the project running quickly.

## Prerequisites

Ensure you have installed:
- ✅ Rust 1.75+ (`rustc --version`)
- ✅ Solana CLI (`solana --version`)
- ✅ Anchor 0.30+ (`anchor --version`)
- ✅ Node.js 18+ (`node --version`)
- ✅ Yarn (`yarn --version`)
- ⏳ Arcium CLI (installation pending network issues)

## Project Structure

```
cyberpunk/
├── programs/               # Solana program (Anchor/Rust)
│   └── private-markets/
│       ├── src/
│       │   ├── lib.rs                # Program entrypoint
│       │   ├── state.rs              # Account structures
│       │   ├── error.rs              # Error definitions
│       │   ├── constants.rs          # Constants and seeds
│       │   └── instructions/         # All 10 instructions
│       └── Cargo.toml
├── tests/                  # Integration tests
│   └── private-markets.ts
├── sdk/                    # TypeScript SDK
│   ├── src/index.ts
│   └── package.json
├── app/                    # Frontend (planned)
└── docs/                   # Documentation
    └── PRD.md
```

## Step 1: Build the Program

```bash
# Build the Solana program
anchor build

# This will:
# - Compile the Rust program
# - Generate the IDL
# - Create the .so file in target/deploy/
```

**Current Status**: ✅ Fixed stack overflow and IDL issues, rebuilding now

## Step 2: Run Tests

```bash
# Run all tests
anchor test

# Or run tests without starting local validator
anchor test --skip-local-validator
```

## Step 3: Deploy to Devnet

```bash
# Configure Solana for devnet
solana config set --url devnet

# Request airdrop for testing
solana airdrop 2

# Deploy the program
anchor deploy
```

## Step 4: Use the SDK

```typescript
// Example: Create a market
import { Connection, Keypair } from "@solana/web3.js";
import { AnchorProvider, Program, workspace } from "@coral-xyz/anchor";
import { createClient } from "@private-markets/sdk";

// Setup
const connection = new Connection("https://api.devnet.solana.com");
const program = workspace.PrivateMarkets;
const client = createClient(connection, program, wallet);

// Create market
const { marketPubkey } = await client.createMarket({
  question: "Will ETH hit $5000 by EOY?",
  endTime: new Date("2025-12-31"),
  feeBps: 100,
  batchInterval: 3600,
  resolverQuorum: 3,
}, usdcMint);

console.log("Market created:", marketPubkey.toString());
```

## Step 5: Arcium Integration (When Available)

Once Arcium CLI is installed:

```bash
# Initialize Arcium computations
arcium init

# Create computation definitions
# (Will be in programs/private-markets/mxe/)

# Deploy with Arcium
arcium deploy --cluster devnet
```

## Common Commands

### Development
```bash
# Watch and rebuild on changes
anchor build --watch

# Run specific test
anchor test --file tests/private-markets.ts

# Check program
anchor check
```

### Deployment
```bash
# Get program ID
anchor keys list

# Update program ID in code
# Edit: programs/private-markets/src/lib.rs
# Edit: Anchor.toml

# Deploy
anchor deploy --provider.cluster devnet
```

### SDK
```bash
cd sdk

# Install dependencies
yarn install

# Build SDK
yarn build

# Watch mode
yarn watch
```

## Troubleshooting

### Build Errors

**Issue**: Stack overflow in instruction
```
Error: Stack offset exceeded max offset of 4096
```
**Fix**: Wrap large Account types in `Box<>` ✅ Fixed

**Issue**: Missing idl-build feature
```
Error: `idl-build` feature is missing
```
**Fix**: Add to Cargo.toml ✅ Fixed

### Arcium Installation

**Issue**: Network connectivity to Arcium CDN
```
Failed to fetch version information
```
**Workaround**: 
- Wait for service to be available
- Try manual installation
- Contact Arcium Discord support

### Node Version

**Issue**: Node version incompatibility
```
Expected version ">=20.18.0". Got "20.15.0"
```
**Fix**: 
```bash
# Upgrade Node
nvm install 20.18.0
nvm use 20.18.0

# Or ignore engines
yarn install --ignore-engines
```

## Testing Locally

### 1. Start Local Validator
```bash
solana-test-validator
```

### 2. Deploy Locally
```bash
anchor build
anchor deploy --provider.cluster localnet
```

### 3. Run Tests
```bash
anchor test --skip-local-validator
```

## Project Status

### ✅ Completed
- Smart contract (all 10 instructions)
- State management
- Error handling
- Test structure
- TypeScript SDK
- Documentation

### 🚧 In Progress
- Build completion (fixing errors)
- Arcium CLI installation

### 📋 Pending
- Arcium MPC definitions
- Frontend UI
- Devnet deployment
- Demo video

## Next Steps

1. **Complete build** (in progress)
2. **Run tests** to verify all instructions
3. **Install SDK dependencies** and build
4. **Retry Arcium installation** when network stable
5. **Create MPC computation definitions**
6. **Build frontend** with Next.js
7. **Deploy to devnet**
8. **Record demo** and submit

## Resources

- **Docs**: `/docs/PRD.md` - Complete architecture and requirements
- **Status**: `/STATUS.md` - Detailed progress tracking
- **Setup**: `/SETUP_ARCIUM.md` - Arcium-specific setup
- **Summary**: `/PROJECT_SUMMARY.md` - Project overview

## Getting Help

- **Arcium Docs**: https://docs.arcium.com/developers
- **Arcium Discord**: https://discord.com/invite/arcium
- **Anchor Docs**: https://www.anchor-lang.com/docs
- **Solana Docs**: https://solana.com/docs

## Quick Reference

### Program Instructions
1. `create_market` - Initialize new market
2. `deposit_collateral` - Deposit funds
3. `submit_private_trade` - Submit encrypted order
4. `update_cfmm_state` - Apply MPC results
5. `submit_batch_order` - Batch auction order
6. `apply_batch_clear` - Apply batch results
7. `stake_resolver` - Become resolver
8. `submit_attestation` - Submit attestation
9. `resolve_market` - Apply final outcome
10. `redeem_tokens` - Redeem winnings

### PDA Seeds
- Market: `["market", authority]`
- Vault: `["vault", market]`
- Fee Vault: `["fee_vault", market]`
- YES Mint: `["yes_mint", market]`
- NO Mint: `["no_mint", market]`
- Resolver: `["resolver", market, authority]`

### Constants
- Min Fee: 0.1% (10 bps)
- Max Fee: 10% (1000 bps)
- Min Batch: 5 minutes (300s)
- Max Batch: 24 hours (86400s)
- Max Resolvers: 10

---

**Ready to build the future of privacy-preserving prediction markets! 🚀**
