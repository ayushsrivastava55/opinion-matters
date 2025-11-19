# Quick Command Reference

## 🚀 Build & Test

### Build Program
```bash
# Build Solana program
anchor build

# Build with verbose output
anchor build --verbose

# Clean and rebuild
anchor clean && anchor build
```

### Run Tests
```bash
# Run all tests
anchor test

# Run tests without local validator (uses devnet)
anchor test --skip-local-validator

# Run specific test file
anchor test --file tests/private-markets.ts
```

### Check Program
```bash
# Verify program compiles
anchor check

# Show program logs
solana logs
```

## 📦 SDK Commands

### Build SDK
```bash
cd sdk

# Install dependencies
yarn install

# Build SDK
yarn build

# Watch mode (auto-rebuild on changes)
yarn watch

# Back to root
cd ..
```

## 🌐 Solana CLI

### Configuration
```bash
# Check current config
solana config get

# Set to devnet
solana config set --url devnet

# Set to localnet
solana config set --url localhost

# Set to mainnet (for reference only)
solana config set --url mainnet-beta
```

### Wallet Management
```bash
# Show wallet address
solana address

# Check balance
solana balance

# Request airdrop (devnet only, 1-2 SOL max)
solana airdrop 2

# Create new keypair
solana-keygen new --outfile ~/.config/solana/my-keypair.json
```

### Program Management
```bash
# Get program ID
anchor keys list

# Deploy program
anchor deploy

# Deploy to specific cluster
anchor deploy --provider.cluster devnet

# Upgrade program
anchor upgrade target/deploy/private_markets.so --program-id <PROGRAM_ID>

# Show program account
solana program show <PROGRAM_ID>
```

## 🔨 Development Workflow

### Local Testing
```bash
# Terminal 1: Start local validator
solana-test-validator

# Terminal 2: Deploy and test
anchor build
anchor deploy --provider.cluster localnet
anchor test --skip-local-validator
```

### Devnet Testing
```bash
# Configure for devnet
solana config set --url devnet

# Get SOL
solana airdrop 2

# Build and deploy
anchor build
anchor deploy

# Run tests against devnet
anchor test --skip-local-validator
```

## 🐛 Debugging

### View Logs
```bash
# Follow program logs
solana logs | grep "<PROGRAM_ID>"

# View transaction
solana confirm -v <SIGNATURE>
```

### Inspect Accounts
```bash
# View account data
solana account <ACCOUNT_ADDRESS>

# View in JSON format
solana account <ACCOUNT_ADDRESS> --output json
```

### Check Program
```bash
# View program info
solana program show <PROGRAM_ID>

# Dump program to file
solana program dump <PROGRAM_ID> program-dump.so
```

## 🔑 Keys & Addresses

### Generate Keys
```bash
# Generate new keypair
solana-keygen new

# Generate with specific output file
solana-keygen new --outfile ~/my-keypair.json

# Generate vanity address (starts with specific characters)
solana-keygen grind --starts-with ABC:1
```

### View Keys
```bash
# Show public key from keypair
solana-keygen pubkey ~/.config/solana/id.json

# Verify keypair
solana-keygen verify <PUBKEY> ~/.config/solana/id.json
```

## 📝 IDL Management

### Generate IDL
```bash
# IDL is generated automatically with anchor build
anchor build

# View IDL
cat target/idl/private_markets.json | jq

# Copy IDL to app
cp target/idl/private_markets.json app/idl/
```

### TypeScript Types
```bash
# Types are generated automatically
ls target/types/

# Use in your app
# import { PrivateMarkets } from "../target/types/private_markets";
```

## 🎯 Arcium Commands

### Installation
```bash
# Install Arcium CLI (when available)
curl --proto '=https' --tlsv1.2 -sSfL https://install.arcium.com/ | bash

# Verify installation
arcium --version
arx --version
```

### Arcium Operations
```bash
# Initialize Arcium project
arcium init

# Build with Arcium
arcium build

# Deploy to Arcium cluster
arcium deploy --cluster devnet

# View Arcium status
arcium status
```

## 📱 Frontend Commands

### Initialize Next.js App
```bash
# Create Next.js app with TypeScript and Tailwind
npx create-next-app@latest app --typescript --tailwind --app

cd app

# Install Solana dependencies
yarn add @solana/web3.js @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-phantom @solana/wallet-adapter-base @coral-xyz/anchor

# Install additional dependencies
yarn add @solana/spl-token recharts date-fns

# Start dev server
yarn dev
```

### Build & Deploy Frontend
```bash
cd app

# Build for production
yarn build

# Deploy to Vercel
vercel deploy

# Or deploy to Netlify
netlify deploy
```

## 🧪 Testing Helpers

### Create Test Accounts
```bash
# Generate test keypairs
solana-keygen new --no-bip39-passphrase --outfile test-keypair.json

# Fund test account
solana airdrop 2 <ADDRESS>
```

### Reset Local State
```bash
# Kill local validator
pkill solana-test-validator

# Clean build artifacts
anchor clean

# Rebuild
anchor build
```

## 📊 Monitoring

### Watch Logs
```bash
# Follow all logs
solana logs

# Follow specific program
solana logs | grep "<PROGRAM_ID>"

# Save logs to file
solana logs > logs.txt
```

### Check Network Status
```bash
# Get cluster info
solana cluster-version

# Check transaction count
solana transaction-count

# View block height
solana block-height

# Check performance
solana ping
```

## 🔧 Maintenance

### Clean Up
```bash
# Clean Anchor build
anchor clean

# Clean Cargo cache
cargo clean

# Clean node modules
rm -rf node_modules sdk/node_modules app/node_modules

# Reinstall
yarn install
```

### Update Dependencies
```bash
# Update Rust
rustup update

# Update Solana
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"

# Update Anchor
avm install latest
avm use latest

# Update Node packages
yarn upgrade
```

## 🎬 Quick Start (Complete Flow)

### From Scratch
```bash
# 1. Build
anchor build

# 2. Start local validator (optional)
solana-test-validator  # In separate terminal

# 3. Deploy locally
anchor deploy --provider.cluster localnet

# 4. Run tests
anchor test --skip-local-validator

# 5. Deploy to devnet
solana config set --url devnet
solana airdrop 2
anchor deploy

# 6. Build SDK
cd sdk && yarn build && cd ..

# 7. Start frontend
cd app && yarn dev
```

## 💡 Useful Aliases

Add these to your `~/.zshrc` or `~/.bashrc`:

```bash
# Anchor shortcuts
alias ab='anchor build'
alias at='anchor test --skip-local-validator'
alias ad='anchor deploy'
alias ac='anchor clean'

# Solana shortcuts
alias sca='solana config get'
alias scl='solana config set --url localhost'
alias scd='solana config set --url devnet'
alias sb='solana balance'
alias sa='solana airdrop 2'

# Combined workflows
alias abt='anchor build && anchor test --skip-local-validator'
alias abd='anchor build && anchor deploy'
```

## 🚨 Troubleshooting Commands

### Program Not Deploying
```bash
# Check balance
solana balance

# Request more SOL
solana airdrop 2

# Check program size
ls -lh target/deploy/*.so

# Try deploying with max retries
anchor deploy --provider.cluster devnet --provider.wallet ~/.config/solana/id.json
```

### Tests Failing
```bash
# Clean and rebuild
anchor clean
anchor build

# Check if validator is running
solana cluster-version

# Reset test validator data
rm -rf test-ledger
solana-test-validator --reset
```

### Build Errors
```bash
# Update Rust toolchain
rustup update stable

# Clean Cargo cache
cargo clean

# Rebuild from scratch
anchor clean && anchor build
```

---

## 📚 Most Used Commands Summary

```bash
# Development cycle
anchor build                                    # Build program
anchor test --skip-local-validator             # Run tests
anchor deploy --provider.cluster devnet        # Deploy

# Solana basics
solana config set --url devnet                 # Switch to devnet
solana balance                                  # Check balance
solana airdrop 2                               # Get test SOL
solana address                                  # Show wallet address

# SDK
cd sdk && yarn build                           # Build SDK
cd app && yarn dev                             # Start frontend

# Debugging
solana logs                                     # View logs
solana confirm -v <SIGNATURE>                  # Check transaction
anchor keys list                                # Show program ID
```

---

*Keep this file handy for quick reference during development!*
